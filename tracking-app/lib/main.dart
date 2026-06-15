import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:app_links/app_links.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'tracking_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Load .env before anything else
  await dotenv.load(fileName: '.env');
  runApp(const N2DTrackingApp());
}

class N2DTrackingApp extends StatelessWidget {
  const N2DTrackingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'N2D Agent',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF4F46E5)),
        useMaterial3: true,
      ),
      home: const TrackingScreen(),
    );
  }
}

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  bool isTracking = false;

  // Deep link params — set from n2d://track?order_id=X&helper_code=Y
  String? _orderId;
  String? _helperCode;
  int _helperId = 1; // Default, resolved from helper_code if possible

  @override
  void initState() {
    super.initState();
    _initForegroundTask();
    _checkServiceStatus();
    _handleDeepLink();
  }

  // ==========================================
  // Read deep link: n2d://track?order_id=79&helper_code=N2D-0538
  // ==========================================
  void _handleDeepLink() async {
    final appLinks = AppLinks();

    // Handle app opened FROM COLD START via deep link
    final initialUri = await appLinks.getInitialLink();
    if (initialUri != null) {
      _parseLink(initialUri);
    }

    // Handle app opened while already running
    appLinks.uriLinkStream.listen((uri) {
      _parseLink(uri);
    });
  }

  void _parseLink(Uri uri) {
    final orderId = uri.queryParameters['order_id'];
    final helperCode = uri.queryParameters['helper_code'];

    // ── INPUT VALIDATION ──────────────────────────────────────
    // order_id must be a positive integer
    if (orderId != null && int.tryParse(orderId) == null) {
      _showError('Invalid order link: bad order_id format.');
      return;
    }
    // helper_code must match pattern: N2D-XXXX (letters/digits after dash)
    if (helperCode != null &&
        !RegExp(r'^N2D-[A-Z0-9]{4,}$').hasMatch(helperCode)) {
      _showError('Invalid order link: bad helper code format.');
      return;
    }
    // ─────────────────────────────────────────────────────────

    if (orderId != null || helperCode != null) {
      setState(() {
        _orderId = orderId;
        _helperCode = helperCode;
      });

      // Extract numeric helper_id from helper_code (e.g. "N2D-0538" → 538)
      if (helperCode != null && helperCode.contains('-')) {
        final parts = helperCode.split('-');
        _helperId = int.tryParse(parts.last) ?? 1;
      }

      print('Deep link parsed → order_id=$_orderId helper_code=$_helperCode helper_id=$_helperId');

      // Auto-start tracking if we got an order deep link
      if (!isTracking) {
        _startTracking();
      }
    }
  }

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'n2d_tracking_channel',
        channelName: 'N2D Agent Tracking',
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(10000), // every 10s
        autoRunOnBoot: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  void _checkServiceStatus() async {
    var isRunning = await FlutterForegroundTask.isRunningService;
    setState(() {
      isTracking = isRunning;
    });
  }

  Future<bool> _handlePermissions() async {
    final locationStatus = await Permission.location.request();
    if (!locationStatus.isGranted) {
      _showError('Location permission is required.');
      return false;
    }

    if (await Permission.notification.isDenied) {
      await Permission.notification.request();
    }

    final backgroundLocationStatus = await Permission.locationAlways.request();
    if (!backgroundLocationStatus.isGranted) {
      _showError('Background Location (Allow all the time) is required.');
      return false;
    }

    return true;
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<void> _startTracking() async {
    bool hasPermission = await _handlePermissions();
    if (!hasPermission) return;

    // Pass helper_id and order_id to the background service via shared data
    await FlutterForegroundTask.saveData(key: 'helper_id', value: _helperId.toString());
    await FlutterForegroundTask.saveData(key: 'order_id', value: _orderId ?? '');

    final result = await FlutterForegroundTask.startService(
      notificationTitle: 'N2D Agent Active',
      notificationText: '📍 Tracking your location...',
      callback: startCallback,
    );

    if (result is ServiceRequestSuccess) {
      setState(() => isTracking = true);
    } else {
      _showError('Failed to start tracking service.');
    }
  }

  void _toggleTracking() async {
    if (isTracking) {
      final result = await FlutterForegroundTask.stopService();
      if (result is ServiceRequestSuccess) {
        setState(() => isTracking = false);
      }
    } else {
      await _startTracking();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Agent Dashboard',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF4F46E5),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const SizedBox(height: 50),
              Image.asset('assets/brand_logo.png', height: 120),
              const SizedBox(height: 20),

              // Show order info if launched from deep link
              if (_orderId != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4F46E5).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF4F46E5).withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.receipt_long, color: Color(0xFF4F46E5), size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Order #$_orderId  •  $_helperCode',
                        style: const TextStyle(
                            color: Color(0xFF4F46E5),
                            fontWeight: FontWeight.bold,
                            fontSize: 14),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.1),
                      spreadRadius: 5,
                      blurRadius: 7,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Icon(
                      isTracking ? Icons.location_on : Icons.location_off,
                      size: 100,
                      color: isTracking ? Colors.green : Colors.grey,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      isTracking ? "ONLINE & TRACKING" : "OFFLINE",
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: isTracking ? Colors.green : Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      isTracking
                          ? "Your live location is being shared"
                          : "Turn on to start sharing location",
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 60),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 65),
                  backgroundColor:
                      isTracking ? Colors.red : const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                  elevation: 5,
                ),
                onPressed: _toggleTracking,
                child: Text(
                  isTracking ? "GO OFFLINE (STOP)" : "GO ONLINE (START)",
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                "N2D Agent © 2026",
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
