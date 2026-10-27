package com.lozef

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.content.Intent
import android.net.Uri

class AgentModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "AgentModule"

    @ReactMethod
    fun getScreenHierarchy(promise: Promise) {
        val service = AgentAccessibilityService.instance
        if (service == null) {
            promise.reject("ERR_SERVICE", "Accessibility Service is not enabled.")
            return
        }
        promise.resolve(service.getScreenHierarchy())
    }

    @ReactMethod
    fun performAction(target: String, action: String, text: String?, promise: Promise) {
        val service = AgentAccessibilityService.instance
        if (service == null) {
            promise.reject("ERR_SERVICE", "Accessibility Service is not enabled.")
            return
        }
        val success = service.performAction(target, action, text)
        promise.resolve(success)
    }

    @ReactMethod
    fun performScroll(direction: String, promise: Promise) {
        val service = AgentAccessibilityService.instance
        if (service == null) {
            promise.reject("ERR_SERVICE", "Accessibility Service is not enabled.")
            return
        }
        val success = service.performScroll(direction)
        promise.resolve(success)
    }

    @ReactMethod
    fun waitMs(ms: Double, promise: Promise) {
        try {
            Thread.sleep(ms.toLong())
            promise.resolve(true)
        } catch (e: InterruptedException) {
            promise.reject("ERR_WAIT", e.message)
        }
    }
    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
      try {
           val context = reactApplicationContext
           val intent = context.packageManager.getLaunchIntentForPackage(packageName)
           if (intent != null) {
               intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                promise.resolve(true)
           } else {
            promise.reject("ERR_LAUNCH", "Package not found: $packageName")
           }
      } catch (e: Exception) {
        promise.reject("ERR_LAUNCH", e.message)
      }
    }
}