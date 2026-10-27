package com.lozef.app

com.facebook.react.ReactPackage
com.facebook.react.bridge.NativeModule
com.facebook.react.bridge.ReactApplicationContext
com.facebook.react.uimanager.ViewManager

class AgentPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AgentModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}