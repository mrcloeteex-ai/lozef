/**
 * Lozef - Autonomous Android Agent App
 * @format
 */

import React, { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  NativeModules,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { GoogleGenAI } from '@google/genai';

const { AgentModule } = NativeModules;
const ai = new GoogleGenAI({ apiKey: 'YOUR_GEMINI_API_KEY' });

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [goal, setGoal] = useState('');
  const [logs, setLogs] = useState('Lozef Engine online. Enable Accessibility Service in Settings.');
  const [isRunning, setIsRunning] = useState(false);

  const executeLozefAction = async () => {
    if (!goal.trim()) return;
    setIsRunning(true);
    setLogs(prev => prev + `\n\n[Lozef] Starting Autonomous Mission: "${goal}"`);

    let stepCount = 0;
    const maxSteps = 12; // Safety brake against infinite loops
    let taskCompleted = false;

    try {
      while (stepCount < maxSteps && !taskCompleted) {
        stepCount++;
        setLogs(prev => prev + `\n\n--- [Step ${stepCount} of ${maxSteps}] ---`);

        // 1. Capture current screen UI layout via native accessibility service
        const hierarchy = await AgentModule.getScreenHierarchy();
        setLogs(prev => prev + '\n[Lozef] Screen parsed.');

        // 2. Query Gemini with expanded action instructions
        const prompt = `
          You are Lozef, an advanced autonomous Android device control agent.
          The overall user goal is: "${goal}"

          Here is the real-time node hierarchy of the active screen on the device:
          ${hierarchy}

          Analyze the visible elements carefully. Determine the next logical step to reach the goal.
          If you need to open an app and know its package name (e.g., com.whatsapp for WhatsApp, com.android.camera2 for Camera, com.google.android.apps.messaging for Messages), use LAUNCH_APP.
          If the target item or button is not visible on screen, choose SCROLL_DOWN or SCROLL_UP to find it.
          If the goal has already been successfully accomplished, set action to "FINISH".
          
          Respond ONLY in valid raw JSON with zero markdown code blocks:
          {
            "thought": "Short explanation of why you are choosing this action",
            "action": "LAUNCH_APP" | "CLICK" | "TYPE" | "SCROLL_DOWN" | "SCROLL_UP" | "FINISH",
            "target": "Package name for LAUNCH_APP, or exact text/ID for CLICK/TYPE (null if scrolling/finishing)",
            "input_text": "Text to type if action is TYPE, otherwise null"
          }
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let decision;
        try {
          decision = JSON.parse(cleanJson);
        } catch (parseError) {
          setLogs(prev => prev + `\n[Lozef Error] Failed to parse model JSON: ${rawText}`);
          break;
        }

        setLogs(prev => prev + `\n[Thought] ${decision.thought}`);

        if (decision.action === 'FINISH') {
          taskCompleted = true;
          setLogs(prev => prev + '\n[Lozef] Mission Accomplished successfully!');
          break;
        }

        // 3. Execute action via native module
        let success = false;
        if (decision.action === 'LAUNCH_APP') {
          setLogs(prev => prev + `\n[Action] Launching app package: ${decision.target}`);
          success = await AgentModule.launchApp(decision.target);
        } else if (decision.action === 'SCROLL_DOWN' || decision.action === 'SCROLL_UP') {
          setLogs(prev => prev + `\n[Action] Executing ${decision.action}`);
          success = await AgentModule.performScroll(decision.action.includes('DOWN') ? 'DOWN' : 'UP');
        } else {
          setLogs(prev => prev + `\n[Action] ${decision.action} -> "${decision.target}"`);
          success = await AgentModule.performAction(
            decision.target,
            decision.action,
            decision.input_text
          );
        }

        if (!success) {
          setLogs(prev => prev + `\n[Warning] Action failed to execute. Retrying strategy...`);
        }

        // 4. Wait for UI transition/animation to complete
        setLogs(prev => prev + '\n[Lozef] Waiting for UI transition...');
        await AgentModule.waitMs(2000);
      }

      if (!taskCompleted && stepCount >= maxSteps) {
        setLogs(prev => prev + '\n[Lozef] Stopped: Reached maximum safety step limit.');
      }

    } catch (error: any) {
      setLogs(prev => prev + `\n[Lozef Fatal Error] ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
        },
      ]}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>LOZEF</Text>
        <Text style={styles.subtitle}>Autonomous Device Agent</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="e.g. Open WhatsApp and message John"
        placeholderTextColor="#666"
        value={goal}
        onChangeText={setGoal}
      />

      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={executeLozefAction}
        disabled={isRunning}>
        <Text style={styles.buttonText}>
          {isRunning ? 'EXECUTING...' : 'RUN TASK'}
        </Text>
      </TouchableOpacity>

      <View style={styles.terminal}>
        <Text style={styles.terminalHeader}>SYSTEM LOGS</Text>
        <ScrollView style={styles.logScroll}>
          <Text style={styles.logText}>{logs}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#141419',
    borderColor: '#22222e',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    padding: 14,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#00e5ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#334155',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  terminal: {
    flex: 1,
    backgroundColor: '#050508',
    borderColor: '#1e1e2d',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  terminalHeader: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    color: '#00ff88',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default App;