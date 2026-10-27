package com.lozef

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AgentAccessibilityService : AccessibilityService() {

    companion object {
        var instance: AgentAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Track UI state changes if needed
    }

    override fun onInterrupt() {
        instance = null
    }

    // Dump current screen node hierarchy text for Gemini to analyze
    fun getScreenHierarchy(): String {
        val rootNode = rootInActiveWindow ?: return "No active window content"
        val sb = StringBuilder()
        dumpNode(rootNode, sb, 0)
        return sb.toString()
    }

    private fun dumpNode(node: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        val indent = "  ".repeat(depth)
        val text = node.text ?: ""
        val className = node.className ?: ""
        val viewId = node.viewIdResourceName ?: "no-id"
        val clickable = node.isClickable

        sb.append("$indent- Class: $className | ID: $viewId | Text: '$text' | Clickable: $clickable\n")

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                dumpNode(child, sb, depth + 1)
                child.recycle()
            }
        }
    }

    // Execute actions commanded by Gemini
    fun performAction(targetText: String, actionType: String, textToType: String?): Boolean {
        val normalizedAction = actionType.uppercase()

        if (normalizedAction.startsWith("SCROLL")) {
            val direction = if (normalizedAction.contains("UP")) "UP" else "DOWN"
            return performScroll(direction)
        }

        val rootNode = rootInActiveWindow ?: return false
        val node = findNodeByText(rootNode, targetText) ?: return false

        return when (normalizedAction) {
            "CLICK" -> node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            "TYPE" -> {
                node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, textToType ?: "")
                }
                node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            }
            else -> false
        }
    }

    // Gesture dispatch for scrolling screens
    fun performScroll(direction: String): Boolean {
        val metrics = resources.displayMetrics
        val screenWidth = metrics.widthPixels.toFloat()
        val screenHeight = metrics.heightPixels.toFloat()

        val path = Path()
        when (direction.uppercase()) {
            "DOWN" -> {
                path.moveTo(screenWidth / 2, screenHeight * 0.7f)
                path.lineTo(screenWidth / 2, screenHeight * 0.3f)
            }
            "UP" -> {
                path.moveTo(screenWidth / 2, screenHeight * 0.3f)
                path.lineTo(screenWidth / 2, screenHeight * 0.7f)
            }
            else -> return false
        }

        val builder = GestureDescription.Builder()
        val strokeDescription = GestureDescription.StrokeDescription(path, 0, 400)
        builder.addStroke(strokeDescription)

        return dispatchGesture(builder.build(), null, null)
    }

    private fun findNodeByText(node: AccessibilityNodeInfo, query: String): AccessibilityNodeInfo? {
        if (node.text?.toString()?.contains(query, ignoreCase = true) == true) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val found = findNodeByText(child, query)
                if (found != null) return found
                child.recycle()
            }
        }
        return null
    }
}