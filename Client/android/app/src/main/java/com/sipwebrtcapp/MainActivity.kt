package com.sipwebrtcapp

import android.os.Build
import android.content.res.Configuration
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SipWebRTCApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()

    // Automatically enter PiP mode when home button is pressed during an active video call
    if (PipModule.isVideoCallActive) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        try {
          enterPictureInPictureMode()
        } catch (e: Exception) {
          // Fallback or log if system fails to enter PiP
        }
      }
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)

    // Broadcast the PiP mode change event to JavaScript
    val reactHost = (application as ReactApplication).reactHost
    val reactContext = reactHost?.currentReactContext
    if (reactContext != null) {
      val params = Arguments.createMap()
      params.putBoolean("isInPictureInPictureMode", isInPictureInPictureMode)
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onPipModeChanged", params)
    }
  }
}
