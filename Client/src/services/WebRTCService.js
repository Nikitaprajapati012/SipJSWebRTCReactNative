/**
 * Client/src/services/WebRTCService.js
 * 
 * Manages all WebRTC operations, including media stream acquisition,
 * peer connection setup, ICE gathering, and audio control (mute/speaker mock).
 * 
 * Uses unified-plan addTrack / ontrack APIs supported by react-native-webrtc.
 */

import { RTCPeerConnection, mediaDevices } from 'react-native-webrtc';
import { NativeModules } from 'react-native';
import { RTC_CONFIG } from '../config';

const { AudioRouteModule } = NativeModules;
import Logger from './Logger';

class WebRTCService {
  constructor() {
    this.username = 'System';
  }

  setUsername(username) {
    this.username = username;
  }

  /**
   * Acquire local audio media stream.
   * Called before starting or answering a call.
   * 
   * @returns {Promise<MediaStream>} - Local media stream (audio-only)
   */
  async getLocalStream() {
    Logger.log({
      username: this.username,
      module: 'WebRTCService',
      method: 'getLocalStream()',
      action: 'Media Stream Request',
      result: 'Requesting microphone permissions and stream'
    });

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false, // Audio calling only
      });

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'getLocalStream()',
        action: 'Media Stream Success',
        result: `Audio track gathered. ID: ${stream.getAudioTracks()[0]?.id}`
      });

      return stream;
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'getLocalStream()',
        action: 'Media Stream Failed',
        result: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize a new RTCPeerConnection.
   * 
   * @param {MediaStream} localStream - Active local audio stream
   * @param {Function} onTrackCallback - Triggers when remote media track is received
   * @returns {RTCPeerConnection}
   */
  createPeerConnection(localStream, onTrackCallback) {
    Logger.log({
      username: this.username,
      module: 'WebRTCService',
      method: 'createPeerConnection()',
      action: 'PeerConnection Init',
      result: `Using RTC Configuration: ${JSON.stringify(RTC_CONFIG)}`
    });

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
        Logger.log({
          username: this.username,
          module: 'WebRTCService',
          method: 'createPeerConnection()',
          action: 'Local Track Added',
          result: `Track ID: ${track.id}`
        });
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'ontrack()',
        action: 'Remote Track Received',
        result: `Stream count: ${event.streams?.length}`
      });
      if (event.streams && event.streams[0]) {
        onTrackCallback(event.streams[0]);
      }
    };

    // Monitor connection states
    pc.oniceconnectionstatechange = () => {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'oniceconnectionstatechange()',
        action: 'ICE Connection State Change',
        result: pc.iceConnectionState
      });
    };

    pc.onconnectionstatechange = () => {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'onconnectionstatechange()',
        action: 'Connection State Change',
        result: pc.connectionState
      });
    };

    return pc;
  }

  /**
   * Wait for ICE gathering to complete before returning SDP (Vanilla ICE).
   * This embeds all ICE candidates directly in the SDP offer/answer.
   * 
   * @param {RTCPeerConnection} pc - PeerConnection instance
   * @returns {Promise<void>} Resolves when state is 'complete'
   */
  async waitForIceGathering(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const onStateChange = () => {
        Logger.log({
          username: this.username,
          module: 'WebRTCService',
          method: 'waitForIceGathering()',
          action: 'ICE Gathering State Update',
          result: pc.iceGatheringState
        });

        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', onStateChange);
          resolve();
        }
      };

      pc.addEventListener('icegatheringstatechange', onStateChange);
    });
  }

  /**
   * Generate WebRTC Offer SDP.
   * 
   * @param {RTCPeerConnection} pc
   * @returns {Promise<string>} - Local SDP offer text
   */
  async createOffer(pc) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createOffer()',
        action: 'SDP Offer Created',
        result: 'Waiting for ICE candidate gathering...'
      });

      await this.waitForIceGathering(pc);

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createOffer()',
        action: 'SDP Offer Ready',
        result: 'Gathered candidates. SDP length: ' + pc.localDescription.sdp.length
      });

      return pc.localDescription.sdp;
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createOffer()',
        action: 'Create Offer Failed',
        result: error.message
      });
      throw error;
    }
  }

  /**
   * Generate WebRTC Answer SDP.
   * 
   * @param {RTCPeerConnection} pc
   * @param {string} remoteOfferSdp - Received SDP offer
   * @returns {Promise<string>} - Local SDP answer text
   */
  async createAnswer(pc, remoteOfferSdp) {
    try {
      await pc.setRemoteDescription({
        type: 'offer',
        sdp: remoteOfferSdp,
      });

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createAnswer()',
        action: 'Remote Description Set',
        result: 'Set caller SDP offer'
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createAnswer()',
        action: 'SDP Answer Created',
        result: 'Waiting for ICE candidate gathering...'
      });

      await this.waitForIceGathering(pc);

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createAnswer()',
        action: 'SDP Answer Ready',
        result: 'Gathered candidates. SDP length: ' + pc.localDescription.sdp.length
      });

      return pc.localDescription.sdp;
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'createAnswer()',
        action: 'Create Answer Failed',
        result: error.message
      });
      throw error;
    }
  }

  /**
   * Set Remote Answer SDP.
   * 
   * @param {RTCPeerConnection} pc
   * @param {string} remoteAnswerSdp - Received SDP answer
   */
  async setRemoteAnswer(pc, remoteAnswerSdp) {
    try {
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: remoteAnswerSdp,
      });

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'setRemoteAnswer()',
        action: 'Remote Answer Set',
        result: 'Set callee SDP answer. Call connected.'
      });
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'setRemoteAnswer()',
        action: 'Set Remote Answer Failed',
        result: error.message
      });
      throw error;
    }
  }

  /**
   * Mute or Unmute the local audio stream track.
   * 
   * @param {MediaStream} localStream
   * @param {boolean} isMuted
   */
  toggleMute(localStream, isMuted) {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });

      Logger.log({
        username: this.username,
        module: 'WebRTCService',
        method: 'toggleMute()',
        action: isMuted ? 'Muted Mic' : 'Unmuted Mic',
        result: `Mute state set to ${isMuted}`
      });
    }
  }

  /**
   * Route audio to speakerphone or receiver.
   * Since native audio routing libraries are omitted to keep dependencies light,
   * we log and simulate this operation for UI changes.
   * 
   * @param {boolean} useSpeaker
   */
  async toggleSpeaker(useSpeaker) {
    Logger.log({
      username: this.username,
      module: 'WebRTCService',
      method: 'toggleSpeaker()',
      action: useSpeaker ? 'Speakerphone Enabled' : 'Speakerphone Disabled',
      result: useSpeaker ? 'Audio routed to external speaker' : 'Audio routed to internal earpiece'
    });

    if (AudioRouteModule) {
      AudioRouteModule.setSpeakerphoneOn(useSpeaker);
    }
  }

  /**
   * Clean up WebRTC peer connection and streams.
   * 
   * @param {RTCPeerConnection} pc
   * @param {MediaStream} localStream
   */
  close(pc, localStream) {
    Logger.log({
      username: this.username,
      module: 'WebRTCService',
      method: 'close()',
      action: 'Tear Down WebRTC',
      result: 'Stopping tracks and closing PeerConnection'
    });

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        Logger.log({
          username: this.username,
          module: 'WebRTCService',
          method: 'close()',
          action: 'Local Track Stopped',
          result: `Track ID: ${track.id}`
        });
      });
    }

    if (pc) {
      pc.close();
    }
  }
}

export default new WebRTCService();
