package com.sipwebrtcapp

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechRecognitionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), RecognitionListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String {
        return "SpeechRecognitionModule"
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            if (reactContext.hasActiveCatalystInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        } catch (e: Exception) {
            Log.e("SpeechRecognitionModule", "Failed to send event $eventName: ${e.message}")
        }
    }

    @ReactMethod
    fun startListening(language: String?) {
        mainHandler.post {
            try {
                if (speechRecognizer != null) {
                    try { speechRecognizer?.destroy() } catch (e: Exception) {}
                    speechRecognizer = null
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)
                speechRecognizer?.setRecognitionListener(this)

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                    putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, reactContext.packageName)
                    if (!language.isNullOrEmpty()) {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
                    }
                }

                speechRecognizer?.startListening(intent)
                isListening = true
                Log.d("SpeechRecognitionModule", "Native Android SpeechRecognizer started")
            } catch (e: Exception) {
                Log.e("SpeechRecognitionModule", "Error starting speech recognition: ${e.message}")
                val params = Arguments.createMap().apply {
                    putString("error", e.message)
                }
                sendEvent("onSpeechError", params)
            }
        }
    }

    @ReactMethod
    fun stopListening() {
        mainHandler.post {
            try {
                isListening = false
                speechRecognizer?.stopListening()
                Log.d("SpeechRecognitionModule", "Native Android SpeechRecognizer stopped")
            } catch (e: Exception) {
                Log.e("SpeechRecognitionModule", "Error stopping speech recognition: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun cancelListening() {
        mainHandler.post {
            try {
                isListening = false
                speechRecognizer?.cancel()
                Log.d("SpeechRecognitionModule", "Native Android SpeechRecognizer cancelled")
            } catch (e: Exception) {
                Log.e("SpeechRecognitionModule", "Error cancelling speech recognition: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun isSpeechAvailable(promise: Promise) {
        try {
            val available = SpeechRecognizer.isRecognitionAvailable(reactContext)
            promise.resolve(available)
        } catch (e: Exception) {
            promise.reject("ERR_SPEECH_CHECK", e.message)
        }
    }

    // --- RecognitionListener Callbacks ---

    override fun onReadyForSpeech(params: Bundle?) {
        val map = Arguments.createMap().apply {
            putBoolean("status", true)
        }
        sendEvent("onSpeechStart", map)
    }

    override fun onBeginningOfSpeech() {
        val map = Arguments.createMap().apply {
            putBoolean("status", true)
        }
        sendEvent("onSpeechBeginning", map)
    }

    override fun onRmsChanged(rmsdB: Float) {
        val map = Arguments.createMap().apply {
            putDouble("value", rmsdB.toDouble())
        }
        sendEvent("onSpeechVolume", map)
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        val map = Arguments.createMap().apply {
            putBoolean("status", true)
        }
        sendEvent("onSpeechEnd", map)
    }

    override fun onError(error: Int) {
        val errorMessage = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input timeout"
            else -> "Unknown error code: $error"
        }
        Log.w("SpeechRecognitionModule", "SpeechRecognizer error: $errorMessage ($error)")

        val map = Arguments.createMap().apply {
            putInt("code", error)
            putString("message", errorMessage)
        }
        sendEvent("onSpeechError", map)
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = if (!matches.isNullOrEmpty()) matches[0] else ""

        Log.d("SpeechRecognitionModule", "Native Final Speech Result: \"$text\"")

        val map = Arguments.createMap().apply {
            putString("text", text)
            putBoolean("isFinal", true)
            val arr = Arguments.createArray()
            matches?.forEach { arr.pushString(it) }
            putArray("matches", arr)
        }
        sendEvent("onSpeechResults", map)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = if (!matches.isNullOrEmpty()) matches[0] else ""

        Log.d("SpeechRecognitionModule", "Native Partial Speech Result: \"$text\"")

        val map = Arguments.createMap().apply {
            putString("text", text)
            putBoolean("isFinal", false)
        }
        sendEvent("onSpeechPartialResults", map)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}
}
