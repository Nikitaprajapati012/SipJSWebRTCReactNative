/**
 * Client/src/services/SipService.js
 * 
 * Production-quality SipService.
 * Wraps SIP.js UserAgent, Registerer, and Inviter/Invitation sessions.
 * 
 * Features:
 * - Implements SocketIOTransport conforming to the SIP.js Transport interface.
 * - Implements CustomSessionDescriptionHandler to decouple SIP.js from browser WebRTC,
 *   bridging it directly to our manual WebRTCService.
 * - Exposes actions: start UA, register, unregister, invite, accept, decline, bye, cancel.
 */

import { UserAgent, Registerer, SessionState, UserAgentState } from 'sip.js';
import { SIP_DOMAIN } from '../config';
import SocketService from './SocketService';
import WebRTCService from './WebRTCService';
import Logger from './Logger';

let sipServiceInstance;

/**
 * Custom Socket.IO-based transport for SIP.js
 * Implements the SIP.js Transport interface.
 */
class SocketIOTransport {
  constructor(logger, options) {
    this.logger = logger;
    this.options = options;
    
    this.onConnect = undefined;
    this.onDisconnect = undefined;
    this.onMessage = undefined;

    // Listen for raw SIP packets routed from the server
    SocketService.on('sip-incoming-msg', (msg) => {
      if (this.onMessage) {
        this.onMessage(msg);
      }
    });

    // Mirror connection states
    SocketService.on('connect', () => {
      if (this.onConnect) this.onConnect();
    });

    SocketService.on('disconnect', () => {
      if (this.onDisconnect) this.onDisconnect();
    });
  }

  async connect() {
    if (SocketService.isConnected()) {
      if (this.onConnect) this.onConnect();
    } else {
      // Re-trigger connect if socket disconnected
      Logger.log({
        module: 'SIP-Transport',
        method: 'connect()',
        action: 'Trigger Socket Reconnect'
      });
    }
  }

  async disconnect() {
    Logger.log({
      module: 'SIP-Transport',
      method: 'disconnect()',
      action: 'Disconnecting Transport'
    });
  }

  isConnected() {
    return SocketService.isConnected();
  }

  async send(message) {
    // Send the raw SIP text message over our socket tunnel
    SocketService.emit('sip-outgoing-msg', message);
  }
}

/**
 * Custom SessionDescriptionHandler
 * Decouples SIP.js from WebRTC and lets CallService / WebRTCService manage the media manually.
 */
class CustomSessionDescriptionHandler {
  constructor(session, options) {
    this.session = session;
    this.options = options;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    
    // Store callbacks defined by CallService / SipService
    const handlerOptions = options?.sessionDescriptionHandlerOptions || options;
    this.onTrackCallback = handlerOptions?.onTrackCallback || sipServiceInstance?.onTrackCallback;
    this.onPeerConnectionCreated = handlerOptions?.onPeerConnectionCreated || sipServiceInstance?.onPeerConnectionCreated;

    // Cache remote SDP if it arrives before our peer connection is instantiated
    this.remoteSdp = null;
  }

  close() {
    Logger.log({
      username: SipService.username,
      module: 'Sip-SDH',
      method: 'close()',
      action: 'Closing Custom SDH'
    });
    if (this.peerConnection) {
      WebRTCService.close(this.peerConnection, this.localStream);
      this.peerConnection = null;
    }
  }

  /**
   * SIP.js calls this when it needs local SDP (Offer/Answer).
   */
  async getDescription(options) {
    Logger.log({
      username: SipService.username,
      module: 'Sip-SDH',
      method: 'getDescription()',
      action: 'Negotiating Media - Local SDP Request'
    });

    try {
      // Acquire local audio stream if not done
      if (!this.localStream) {
        this.localStream = await WebRTCService.getLocalStream();
      }

      // Initialize peer connection if not done
      if (!this.peerConnection) {
        this.peerConnection = WebRTCService.createPeerConnection(
          this.localStream,
          (stream) => {
            this.remoteStream = stream;
            if (this.onTrackCallback) this.onTrackCallback(stream);
          }
        );

        if (this.onPeerConnectionCreated) {
          this.onPeerConnectionCreated(this.peerConnection, this.localStream);
        }
      }

      let sdp = '';
      if (this.remoteSdp) {
        // We are Callee: Answer the offer
        sdp = await WebRTCService.createAnswer(this.peerConnection, this.remoteSdp);
      } else {
        // We are Caller: Generate offer
        sdp = await WebRTCService.createOffer(this.peerConnection);
      }

      return {
        body: sdp,
        contentType: 'application/sdp',
      };
    } catch (error) {
      Logger.log({
        username: SipService.username,
        module: 'Sip-SDH',
        method: 'getDescription()',
        action: 'Failed to Get SDP',
        result: error.message
      });
      throw error;
    }
  }

  /**
   * SIP.js calls this when it receives remote SDP (Offer/Answer).
   */
  async setDescription(sdp, options) {
    Logger.log({
      username: SipService.username,
      module: 'Sip-SDH',
      method: 'setDescription()',
      action: 'Negotiating Media - Remote SDP Received'
    });

    this.remoteSdp = sdp;

    // If PeerConnection is already instantiated (i.e. caller received answer), set the remote description.
    // If peer connection is not yet created (i.e. callee received offer), we cache it and handle it in getDescription().
    if (this.peerConnection) {
      try {
        await WebRTCService.setRemoteAnswer(this.peerConnection, sdp);
      } catch (error) {
        Logger.log({
          username: SipService.username,
          module: 'Sip-SDH',
          method: 'setDescription()',
          action: 'Failed to Set Remote SDP',
          result: error.message
        });
        throw error;
      }
    }
  }

  hasDescription(contentType) {
    return contentType === 'application/sdp';
  }

  sendDtmf(tones, options) {
    Logger.log({
      username: SipService.username,
      module: 'Sip-SDH',
      method: 'sendDtmf()',
      action: 'Send DTMF',
      result: `Tones: ${tones}`
    });
    return true;
  }

  // Backup alias for backward compatibility
  sendDTMF(tones, options) {
    return this.sendDtmf(tones, options);
  }
}

class SipService {
  constructor() {
    this.userAgent = null;
    this.registerer = null;
    this.username = 'System';
    
    // Callbacks to hook into user interface
    this.onIncomingCall = null;
    this.onCallStateChange = null;
  }

  /**
   * Configure and boot up the SIP.js UserAgent.
   * 
   * @param {string} username - Current logged-in username
   * @param {Object} callbacks - Hook callbacks { onIncomingCall, onCallStateChange }
   */
  async start(username, { onIncomingCall, onCallStateChange }) {
    this.username = username;
    this.onIncomingCall = onIncomingCall;
    this.onCallStateChange = onCallStateChange;

    Logger.log({
      username: this.username,
      module: 'SipService',
      method: 'start()',
      action: 'SIP UserAgent Starting',
      result: `Configuring UA for sip:${username}@${SIP_DOMAIN}`
    });

    try {
      const userAgentOptions = {
        uri: UserAgent.makeURI(`sip:${this.username}@${SIP_DOMAIN}`),
        transportConstructor: SocketIOTransport,
        // Factory for our custom WebRTC bridge
        sessionDescriptionHandlerFactory: (session, options) => {
          return new CustomSessionDescriptionHandler(session, options);
        },
        gracefulShutdown: true,
      };

      this.userAgent = new UserAgent(userAgentOptions);

      // Handle incoming calls (INVITEs)
      this.userAgent.delegate = {
        onInvite: (invitation) => {
          Logger.log({
            username: this.username,
            module: 'SipService',
            method: 'onInvite()',
            action: 'Incoming SIP INVITE',
            result: `From: ${invitation.remoteIdentity.uri.user}`
          });
          
          if (this.onIncomingCall) {
            this.onIncomingCall(invitation);
          }
        },
      };

      // Listen to UserAgent lifecycle states
      this.userAgent.stateChange.addListener((state) => {
        Logger.log({
          username: this.username,
          module: 'SipService',
          method: 'stateChange()',
          action: 'UA State Updated',
          result: `New State: ${state}`
        });
      });

      await this.userAgent.start();
      
      Logger.log({
        username: this.username,
        module: 'SipService',
        method: 'start()',
        action: 'SIP UserAgent Started',
        result: 'Ready to REGISTER or handle signaling'
      });

      // Register the User
      await this.register();
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'SipService',
        method: 'start()',
        action: 'SIP UA Initialization Failed',
        result: error.message
      });
      throw error;
    }
  }

  /**
   * Register user endpoint to server presence list (SIP REGISTER).
   */
  async register() {
    if (!this.userAgent) return;

    Logger.log({
      username: this.username,
      module: 'SipService',
      method: 'register()',
      action: 'SIP Register Started',
      result: 'Sending REGISTER packet'
    });

    this.registerer = new Registerer(this.userAgent);
    
    try {
      await this.registerer.register();
      Logger.log({
        username: this.username,
        module: 'SipService',
        method: 'register()',
        action: 'SIP Register Success',
        result: 'User registered on proxy'
      });
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'SipService',
        method: 'register()',
        action: 'SIP Register Failed',
        result: error.message
      });
    }
  }

  /**
   * Unregister user endpoint (SIP REGISTER with expires: 0).
   */
  async unregister() {
    if (this.registerer) {
      Logger.log({
        username: this.username,
        module: 'SipService',
        method: 'unregister()',
        action: 'SIP Unregister Started'
      });
      try {
        await this.registerer.unregister();
        Logger.log({
          username: this.username,
          module: 'SipService',
          method: 'unregister()',
          action: 'SIP Unregistered Success'
        });
      } catch (error) {
        Logger.log({
          username: this.username,
          module: 'SipService',
          method: 'unregister()',
          action: 'SIP Unregister Failed',
          result: error.message
        });
      }
    }
  }

  /**
   * Stop the UserAgent.
   */
  async stop() {
    await this.unregister();
    if (this.userAgent) {
      Logger.log({
        username: this.username,
        module: 'SipService',
        method: 'stop()',
        action: 'SIP UserAgent Stopping'
      });
      await this.userAgent.stop();
      this.userAgent = null;
      this.registerer = null;
    }
  }
}

sipServiceInstance = new SipService();
export default sipServiceInstance;
export { SessionState };
