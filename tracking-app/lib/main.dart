import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:app_links/app_links.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'tracking_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    debugPrint('Could not load .env file: $e');
  }

  runApp(const N2DTrackingApp());
}

class N2DTrackingApp extends StatefulWidget {
  const N2DTrackingApp({super.key});

  @override
  State<N2DTrackingApp> createState() => _N2DTrackingAppState();
}

class _N2DTrackingAppState extends State<N2DTrackingApp> {
  ThemeMode _themeMode = ThemeMode.dark;

  void _toggleTheme() {
    setState(() {
      _themeMode =
          _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Need2done Agent',
      themeMode: _themeMode,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF007AFF),
          secondary: Color(0xFF10B981),
          surface: Colors.white,
        ),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF060B13),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF007AFF),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF0A111E),
        ),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: TrackingScreen(
        isDarkMode: _themeMode == ThemeMode.dark,
        onToggleTheme: _toggleTheme,
      ),
    );
  }
}

class TrackingScreen extends StatefulWidget {
  final bool isDarkMode;
  final VoidCallback onToggleTheme;

  const TrackingScreen({
    super.key,
    required this.isDarkMode,
    required this.onToggleTheme,
  });

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  bool isTracking = false;
  Position? currentPosition;
  String currentAddress = "Fetching location...";
  final MapController _mapController = MapController();

  // Deep link params — set from n2d://track?order_id=X&helper_code=Y
  String? _orderId;
  String? _helperCode;
  int _helperId = 1;

  StreamSubscription<Position>? _positionStreamSubscription;

  @override
  void initState() {
    super.initState();
    _initForegroundTask();
    _checkServiceStatus();
    _handleDeepLink();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _positionStreamSubscription?.cancel();
    super.dispose();
  }

  void _getCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    try {
      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (mounted) {
        setState(() {
          currentPosition = pos;
          currentAddress =
              "${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}";
        });
        _mapController.move(LatLng(pos.latitude, pos.longitude), 15);
      }
    } catch (e) {
      debugPrint("Error getting location: $e");
    }

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position pos) {
      if (mounted) {
        setState(() {
          currentPosition = pos;
          currentAddress =
              "${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}";
        });
        if (isTracking) {
          _mapController.move(LatLng(pos.latitude, pos.longitude), _mapController.camera.zoom);
        }
      }
    });
  }

  void _handleDeepLink() async {
    final appLinks = AppLinks();

    final initialUri = await appLinks.getInitialLink();
    if (initialUri != null) {
      _parseLink(initialUri);
    }

    appLinks.uriLinkStream.listen((uri) {
      _parseLink(uri);
    });
  }

  void _parseLink(Uri uri) {
    final orderId = uri.queryParameters['order_id'];
    final helperCode = uri.queryParameters['helper_code'];

    if (orderId != null && int.tryParse(orderId) == null) {
      _showError('Invalid order link: bad order_id format.');
      return;
    }
    if (helperCode != null &&
        !RegExp(r'^N2D-[A-Z0-9]{4,}$').hasMatch(helperCode)) {
      _showError('Invalid order link: bad helper code format.');
      return;
    }

    if (orderId != null || helperCode != null) {
      setState(() {
        _orderId = orderId;
        _helperCode = helperCode;
      });

      if (helperCode != null && helperCode.contains('-')) {
        final parts = helperCode.split('-');
        _helperId = int.tryParse(parts.last) ?? 1;
      }

      if (!isTracking) {
        _startTracking();
      }
    }
  }

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'n2d_tracking_channel',
        channelName: 'N2D Agent Live Tracking',
        channelDescription: 'Maintains live location sharing with dispatch.',
        priority: NotificationPriority.HIGH,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(10000),
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
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _startTracking() async {
    bool hasPermission = await _handlePermissions();
    if (!hasPermission) return;

    await FlutterForegroundTask.saveData(
        key: 'helper_id', value: _helperId.toString());
    await FlutterForegroundTask.saveData(
        key: 'order_id', value: _orderId ?? '');

    final result = await FlutterForegroundTask.startService(
      notificationTitle: 'Need2done Agent Online',
      notificationText: '📍 Live location is active and being shared.',
      callback: startCallback,
    );

    if (result is ServiceRequestSuccess) {
      setState(() => isTracking = true);
    } else {
      _showError('Failed to start tracking service.');
    }
  }

  Future<void> _stopTracking() async {
    final result = await FlutterForegroundTask.stopService();
    if (result is ServiceRequestSuccess) {
      setState(() => isTracking = false);
    }
  }

  void _confirmToggleOffline() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.isDarkMode
            ? const Color(0xFF0F172A)
            : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.redAccent.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.power_settings_new,
                  color: Colors.redAccent, size: 36),
            ),
            const SizedBox(height: 16),
            Text(
              'Go Offline?',
              style: TextStyle(
                color: widget.isDarkMode ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ],
        ),
        content: Text(
          'Your live location will no longer be shared with customers or dispatch.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: widget.isDarkMode ? Colors.grey[400] : Colors.grey[600],
            fontSize: 14,
          ),
        ),
        actionsAlignment: MainAxisAlignment.spaceEvenly,
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel',
                style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              _stopTracking();
            },
            child: const Text('Go Offline',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final defaultPos = currentPosition != null
        ? LatLng(currentPosition!.latitude, currentPosition!.longitude)
        : const LatLng(17.3850, 78.4866);

    final cardBg = widget.isDarkMode
        ? const Color(0xFF0A111E)
        : Colors.white;
    final cardBorder = widget.isDarkMode
        ? const Color(0xFF1E293B)
        : const Color(0xFFE2E8F0);
    final textPrimary = widget.isDarkMode
        ? Colors.white
        : const Color(0xFF0F172A);
    final textSecondary = widget.isDarkMode
        ? Colors.grey[400]
        : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: widget.isDarkMode
          ? const Color(0xFF060B13)
          : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // ==========================================
            // HEADER BAR: PROMINENT LOGO & THEME SWITCHER
            // ==========================================
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              decoration: BoxDecoration(
                color: cardBg,
                border: Border(
                  bottom: BorderSide(color: cardBorder, width: 1),
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Column(
                    children: [
                      Image.asset(
                        'assets/brand_logo.png',
                        height: 100, // Large, prominent logo matching mockup photo
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => Text(
                          'Need2done',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: widget.isDarkMode
                                ? const Color(0xFF007AFF)
                                : const Color(0xFF0056B3),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isTracking
                                  ? const Color(0xFF10B981)
                                  : Colors.redAccent,
                              boxShadow: [
                                BoxShadow(
                                  color: (isTracking
                                          ? const Color(0xFF10B981)
                                          : Colors.redAccent)
                                      .withOpacity(0.6),
                                  blurRadius: 6,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Location Tracking',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Floating Theme Switcher at Top-Right
                  Positioned(
                    top: 0,
                    right: 0,
                    child: IconButton(
                      onPressed: widget.onToggleTheme,
                      tooltip: widget.isDarkMode
                          ? 'Switch to Light Theme'
                          : 'Switch to Dark Theme',
                      icon: Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: widget.isDarkMode
                              ? const Color(0xFF1E293B)
                              : const Color(0xFFE2E8F0),
                        ),
                        child: Icon(
                          widget.isDarkMode
                              ? Icons.wb_sunny_rounded
                              : Icons.nightlight_round,
                          size: 20,
                          color: widget.isDarkMode
                              ? Colors.amber
                              : const Color(0xFF334155),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ==========================================
            // DEEP LINK ORDER BANNER (IF PRESENT)
            // ==========================================
            if (_orderId != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: const Color(0xFF007AFF).withOpacity(0.15),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.delivery_dining,
                        color: Color(0xFF007AFF), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Assigned Order #$_orderId  •  ${_helperCode ?? ""}',
                      style: const TextStyle(
                        color: Color(0xFF007AFF),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),

            // ==========================================
            // STATUS HEADER CARD
            // ==========================================
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: cardBorder),
                  boxShadow: widget.isDarkMode
                      ? []
                      : [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isTracking
                            ? const Color(0xFF10B981)
                            : Colors.redAccent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isTracking ? 'You are Online' : 'You are Offline',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isTracking
                                ? 'Your location is being shared'
                                : 'Your location is not being shared',
                            style: TextStyle(
                              fontSize: 12,
                              color: textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isTracking
                            ? const Color(0xFF10B981).withOpacity(0.15)
                            : Colors.redAccent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isTracking
                              ? const Color(0xFF10B981).withOpacity(0.4)
                              : Colors.redAccent.withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isTracking
                                ? Icons.cell_tower
                                : Icons.power_off_outlined,
                            size: 13,
                            color: isTracking
                                ? const Color(0xFF10B981)
                                : Colors.redAccent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isTracking ? 'Live' : 'Off',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isTracking
                                  ? const Color(0xFF10B981)
                                  : Colors.redAccent,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ==========================================
            // MAP VIEW (Dark Tiles in Dark Mode, Light Tiles in Light Mode)
            // ==========================================
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: cardBorder),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Stack(
                      children: [
                        FlutterMap(
                          mapController: _mapController,
                          options: MapOptions(
                            initialCenter: defaultPos,
                            initialZoom: 15.0,
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: widget.isDarkMode
                                  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                                  : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                              subdomains: const ['a', 'b', 'c', 'd'],
                              userAgentPackageName: 'in.need2done.agent',
                            ),
                            if (currentPosition != null) ...[
                              CircleLayer(
                                circles: [
                                  CircleMarker(
                                    point: LatLng(currentPosition!.latitude,
                                        currentPosition!.longitude),
                                    radius: 35,
                                    useRadiusInMeter: false,
                                    color: const Color(0xFF007AFF)
                                        .withOpacity(0.2),
                                    borderColor: const Color(0xFF007AFF)
                                        .withOpacity(0.5),
                                    borderStrokeWidth: 1.5,
                                  ),
                                ],
                              ),
                              MarkerLayer(
                                markers: [
                                  Marker(
                                    point: LatLng(currentPosition!.latitude,
                                        currentPosition!.longitude),
                                    width: 24,
                                    height: 24,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF007AFF),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 3),
                                        boxShadow: [
                                          BoxShadow(
                                            color: const Color(0xFF007AFF)
                                                .withOpacity(0.6),
                                            blurRadius: 10,
                                            spreadRadius: 3,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),

                        // Address Pill Overlay (Top Left of Map)
                        Positioned(
                          left: 12,
                          top: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: cardBg.withOpacity(0.92),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: cardBorder),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.location_on,
                                    color: Color(0xFF007AFF), size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  currentAddress,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Floating re-center button on map
                        Positioned(
                          right: 12,
                          bottom: 12,
                          child: InkWell(
                            onTap: () {
                              if (currentPosition != null) {
                                _mapController.move(
                                  LatLng(currentPosition!.latitude,
                                      currentPosition!.longitude),
                                  15,
                                );
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: cardBg.withOpacity(0.92),
                                shape: BoxShape.circle,
                                border: Border.all(color: cardBorder),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.15),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.my_location,
                                color: Color(0xFF007AFF),
                                size: 20,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ==========================================
            // PERFECT SLIDING TOGGLE SWITCH (Zero Overflow)
            // ==========================================
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: GestureDetector(
                onTap: () {
                  if (isTracking) {
                    _confirmToggleOffline();
                  } else {
                    _startTracking();
                  }
                },
                child: Container(
                  height: 60,
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(35),
                    border: Border.all(color: cardBorder, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(widget.isDarkMode ? 0.3 : 0.08),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final totalWidth = constraints.maxWidth;
                      final halfWidth = totalWidth / 2;

                      return Stack(
                        alignment: Alignment.center,
                        children: [
                          // Animated Active Background Pill (Exact 50% width)
                          AnimatedPositioned(
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeInOut,
                            left: isTracking ? 0 : halfWidth,
                            top: 0,
                            bottom: 0,
                            width: halfWidth,
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(35),
                                gradient: isTracking
                                    ? const LinearGradient(
                                        colors: [
                                          Color(0xFF10B981),
                                          Color(0xFF059669)
                                        ],
                                      )
                                    : const LinearGradient(
                                        colors: [
                                          Color(0xFFEF4444),
                                          Color(0xFFDC2626)
                                        ],
                                      ),
                              ),
                            ),
                          ),

                          // Text & Icon Layer
                          Row(
                            children: [
                              // Left: ONLINE
                              Expanded(
                                child: Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.power_settings_new,
                                        size: 18,
                                        color: isTracking
                                            ? Colors.white
                                            : textSecondary,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'ONLINE',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.8,
                                          color: isTracking
                                              ? Colors.white
                                              : textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              // Right: OFFLINE
                              Expanded(
                                child: Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'OFFLINE',
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.8,
                                          color: !isTracking
                                              ? Colors.white
                                              : textSecondary,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Icon(
                                        Icons.power_settings_new,
                                        size: 18,
                                        color: !isTracking
                                            ? Colors.white
                                            : textSecondary,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),

                          // Center Circular Switch Knob (<->)
                          AnimatedPositioned(
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeInOut,
                            left: halfWidth - 24, // Sits exactly on center line
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 8,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                              child: Icon(
                                Icons.swap_horiz,
                                color: isTracking
                                    ? const Color(0xFF10B981)
                                    : Colors.redAccent,
                                size: 24,
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
