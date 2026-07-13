package com.sipwebrtcapp

import android.app.Activity
import android.os.Build
import android.app.PictureInPictureParams
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log

class PipModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PipModule"
    }

    companion object {
        @JvmStatic
        var isVideoCallActive: Boolean = false
    }

    @ReactMethod
    fun setIsVideoCallActive(active: Boolean) {
        isVideoCallActive = active
        Log.d("PipModule", "isVideoCallActive updated to: $active")
    }

    @ReactMethod
    fun enterPip() {
        val activity = reactApplicationContext.currentActivity
        if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val params = PictureInPictureParams.Builder().build()
                activity.enterPictureInPictureMode(params)
                Log.d("PipModule", "Manually entered Picture-in-Picture mode")
            } catch (e: Exception) {
                Log.e("PipModule", "Failed to enter Picture-in-Picture: ${e.message}")
            }
        } else {
            Log.w("PipModule", "PiP not supported on this device/version")
        }
    }
}
