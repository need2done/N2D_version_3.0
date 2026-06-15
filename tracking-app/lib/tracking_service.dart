import 'dart:async';
import 'dart:ui';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';

// ==========================================
// BACKEND API CONNECTION
// Loaded from .env asset at runtime — never hardcoded.
// Change TRACKING_API_URL in .env to switch environments.
// ==========================================
String get API_URL =>
    dotenv.env['TRACKING_API_URL'] ?? 'https://need2done.in/api/tracking/update';

// The callback function must be a top-level or static function.
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(TrackingTaskHandler());
}

class TrackingTaskHandler extends TaskHandler {
  int _helperId = 1;
  String? _orderId;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    // Read helper_id and order_id passed via sendData when service started
    final data = await FlutterForegroundTask.getData<String>(key: 'helper_id');
    final order = await FlutterForegroundTask.getData<String>(key: 'order_id');
    _helperId = int.tryParse(data ?? '1') ?? 1;
    _orderId = order;
    print('onStart: Tracking Task Started | helper_id=$_helperId order_id=$_orderId');
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    try {
      Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);

      final payload = {
        'helper_id': _helperId,
        'lat': position.latitude,
        'lng': position.longitude,
        'timestamp': DateTime.now().toIso8601String(),
      };

      // Include order_id if available (links tracking to specific order)
      if (_orderId != null && _orderId!.isNotEmpty) {
        payload['order_id'] = _orderId as Object;
      }

      await http.post(
        Uri.parse(API_URL),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      FlutterForegroundTask.updateService(
        notificationTitle: 'N2D Agent Active',
        notificationText:
            '📍 Tracking: ${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}',
      );

      print("Location Sent: ${position.latitude}, ${position.longitude} | helper=$_helperId order=$_orderId");
    } catch (e) {
      print("Error sending location: $e");
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    print('onDestroy: Tracking Task Stopped');
  }

  @override
  void onNotificationPressed() {
    FlutterForegroundTask.launchApp('/');
  }
}
