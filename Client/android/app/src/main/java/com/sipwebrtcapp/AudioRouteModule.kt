package com.sipwebrtcapp

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log

class AudioRouteModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var toneGenerator: ToneGenerator? = null

    override fun getName(): String {
        return "AudioRouteModule"
    }

    @ReactMethod
    fun setSpeakerphoneOn(on: Boolean) {
        try {
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            audioManager.isSpeakerphoneOn = on
            Log.d("AudioRouteModule", "Speakerphone toggled: $on")
        } catch (e: Exception) {
            Log.e("AudioRouteModule", "Failed to toggle speakerphone: ${e.message}")
        }
    }

    @ReactMethod
    fun playHoldBeep() {
        try {
            if (toneGenerator == null) {
                // Initialize ToneGenerator on voice call audio stream at 70% volume
                toneGenerator = ToneGenerator(AudioManager.STREAM_VOICE_CALL, 70)
            }
            // TONE_PROP_BEEP is a standard short beep tone (250 milliseconds)
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 250)
            Log.d("AudioRouteModule", "Hold beep played")
        } catch (e: Exception) {
            Log.e("AudioRouteModule", "Failed to play hold beep: ${e.message}")
        }
    }
    @ReactMethod
    fun clearAudioRoute() {
        try {
            audioManager.mode = AudioManager.MODE_NORMAL
            audioManager.isSpeakerphoneOn = false
            Log.d("AudioRouteModule", "Audio route cleared")
        } catch (e: Exception) {
            Log.e("AudioRouteModule", "Failed to clear audio route: ${e.message}")
        }
    }
}
