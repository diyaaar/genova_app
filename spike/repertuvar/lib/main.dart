// Genova repertuvar spike — giriş noktası.
// setup.sh bu dosyayı `flutter create` sonrasında lib/main.dart üstüne kopyalar.
//
// ⚠ pdfrx 2.x API imzaları (PdfViewer.asset / PdfViewerParams.pageOverlaysBuilder)
//   `flutter pub get` sonrası doğrulanmalı — bu dosya derlenmeden yazıldı.
//
// Kapsam: PDF aç → mevcut anotasyonları çiz → stylus ile üstüne çiz.
// Kaydetme, giriş ekranı, tema, navigasyon YOK (bkz. docs/briefs/001-repertuvar-spike.md).

import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:pdfrx/pdfrx.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'annotation_model.dart';
import 'annotation_painter.dart';

// setup.sh bunları .env.local'dan okuyup --dart-define ile geçirir.
const _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
const _email = String.fromEnvironment('SPIKE_EMAIL');
const _password = String.fromEnvironment('SPIKE_PASSWORD');

// Hangi dosyanın anotasyonları çekilecek — Supabase'ten bir repertoire_files.id yapıştır.
const _repertoireFileId = String.fromEnvironment('SPIKE_FILE_ID');

/// Kimlik bilgisi verilmediyse gomulu ornek veriyle calisir — hicbir kurulum
/// gerektirmez. assets/annotations.sample.json + assets/score.pdf (koordinat izgarasi)
/// birlikte "0.5 gercekten ortaya dusuyor mu" sorusunu gozle dogrulatir.
const _useSupabase =
    bool.hasEnvironment('SPIKE_FILE_ID') && _repertoireFileId != '' && _email != '';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // pdfrx 2.2+ zorunlu: çağrılmazsa PdfViewer sessizce boş/gri kalır.
  pdfrxFlutterInitialize();
  if (_useSupabase) {
    await Supabase.initialize(url: _supabaseUrl, publishableKey: _supabaseAnonKey);
  }
  runApp(const SpikeApp());
}

class SpikeApp extends StatelessWidget {
  const SpikeApp({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: SpikePage(),
      );
}

class SpikePage extends StatefulWidget {
  const SpikePage({super.key});
  @override
  State<SpikePage> createState() => _SpikePageState();
}

class _SpikePageState extends State<SpikePage> {
  /// page_number → o sayfadaki katmanlar (aktif = personal, pasif = shared)
  final Map<int, List<_Layer>> _layers = {};

  /// Kullanıcının şu an çizdiği strok (kaydedilmez — sadece gecikme/basınç testi için)
  final List<NormalizedPoint> _live = [];
  double _lastPressure = 0;
  String _lastKind = '—';
  String _status = 'yükleniyor…';
  String _assetInfo = 'asset: kontrol ediliyor…';
  Uint8List? _pdfBytes;
  String? _pdfError;

  @override
  void initState() {
    super.initState();
    _checkAsset();
    _load();
  }

  /// PdfViewer sessizce gri kalirsa suclu asset mi, pdfrx mi — ayirt etmek icin.
  Future<void> _checkAsset() async {
    const path = 'assets/score_40p.pdf';
    try {
      final d = await rootBundle.load(path);
      final bytes = d.buffer.asUint8List(d.offsetInBytes, d.lengthInBytes);
      final head = String.fromCharCodes(bytes.sublist(0, 8));
      setState(() {
        _pdfBytes = bytes;
        _assetInfo = 'asset: ${bytes.length} bayt · başlık "$head"';
      });
    } catch (e) {
      setState(() {
        _pdfError = 'asset OKUNAMADI:\n$e';
        _assetInfo = 'asset HATA';
      });
    }
  }

  Future<void> _load() async {
    try {
      if (!_useSupabase) {
        await _loadSample();
        return;
      }
      final auth = Supabase.instance.client.auth;
      if (auth.currentSession == null) {
        await auth.signInWithPassword(email: _email, password: _password);
      }
      // RLS: tablo yalnızca `authenticated` rolüne açık — giriş şart.
      final rows = await Supabase.instance.client
          .from('repertoire_pdf_annotations')
          .select('page_number, layer_type, annotations_json')
          .eq('repertoire_file_id', _repertoireFileId);

      // Kendi katmanın tam opak, paylaşılan katmanlar soluk (web'deki davranış).
      _ingest((rows as List).cast<Map<String, dynamic>>());
      setState(() => _status = 'SUPABASE · ${_summary()}');
    } catch (e) {
      setState(() => _status = 'HATA: $e');
    }
  }

  /// Gomulu ornek veri — DB satirlariyla ayni sekilde.
  Future<void> _loadSample() async {
    final raw = jsonDecode(
      await rootBundle.loadString('assets/annotations.sample.json'),
    ) as List;
    _ingest(raw.cast<Map<String, dynamic>>());
    setState(() => _status = 'ÖRNEK VERİ · ${_summary()}');
  }

  void _ingest(List<Map<String, dynamic>> rows) {
    _layers.clear();
    for (final row in rows) {
      final page = row['page_number'] as int;
      final items = parseAnnotationsJson(row['annotations_json'] as List);
      final isActive = row['layer_type'] == 'personal';
      _layers.putIfAbsent(page, () => []).add(_Layer(items, isActive));
    }
  }

  String _summary() {
    final total =
        _layers.values.expand((l) => l).fold<int>(0, (n, l) => n + l.items.length);
    return '${_layers.length} sayfa · $total öğe';
  }

  void _onPointer(PointerEvent e, Size size) {
    if (size.isEmpty) return;
    setState(() {
      _lastPressure = e.pressure;
      _lastKind = e.kind.name;
      // Avuç içi reddi: sayfada stylus varken parmak girdisini yok say.
      if (e.kind == PointerDeviceKind.touch && _lastKind == 'stylus') return;
      _live.add(NormalizedPoint(
        e.localPosition.dx / size.width,
        e.localPosition.dy / size.height,
      ));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_status, style: const TextStyle(fontSize: 14)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'kind: $_lastKind   pressure: ${_lastPressure.toStringAsFixed(3)}',
                style: const TextStyle(fontSize: 12),
              ),
              Text(_assetInfo, style: const TextStyle(fontSize: 11)),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: () => setState(_live.clear),
          ),
        ],
      ),
      // NOT: pdfrx asset'i dosya yoluna gore onbellege aliyor. Iceriği degisen
      // bir PDF'i AYNI adla verirsen eski kopyayi tutar ve ekran sessizce gri kalir.
      // Test PDF'ini degistirirken dosya ADINI da degistir.
      body: _pdfBytes == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _pdfError ?? 'PDF yükleniyor…',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13),
                ),
              ),
            )
          : PdfViewer.data(
        _pdfBytes!,
        sourceName: 'score_40p.pdf',
        params: PdfViewerParams(
          pageOverlaysBuilder: (context, pageRect, page) {
            final size = pageRect.size;
            final layers = _layers[page.pageNumber] ?? const <_Layer>[];
            return [
              // Kayıtlı anotasyonlar
              for (final layer in layers)
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(
                      painter: AnnotationPainter(
                        items: layer.items,
                        isActiveLayer: layer.isActive,
                      ),
                    ),
                  ),
                ),
              // Canlı çizim + giriş yakalama
              Positioned.fill(
                child: Listener(
                  behavior: HitTestBehavior.translucent,
                  onPointerDown: (e) => _onPointer(e, size),
                  onPointerMove: (e) => _onPointer(e, size),
                  child: CustomPaint(
                    painter: AnnotationPainter(
                      items: [
                        if (_live.length > 1)
                          PenStroke(
                            id: 'live',
                            color: const Color(0xFFEF4444),
                            points: _live,
                            // strokeWidth normalize: 3px / sayfa genişliği
                            strokeWidth: 3 / size.width,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ];
          },
        ),
      ),
    );
  }
}

class _Layer {
  final List<AnnotationItem> items;
  final bool isActive;
  const _Layer(this.items, this.isActive);
}
