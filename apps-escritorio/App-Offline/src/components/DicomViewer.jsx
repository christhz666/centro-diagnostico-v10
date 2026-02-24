/**
 * DicomViewer.js — Visor médico DICOM con Cornerstone.js
 * Soporta DICOM (.dcm) e imágenes estándar (JPG, PNG)
 * Herramientas clínicas: WW/WL, Zoom, Pan, Longitud, ROI, Ángulo, Densidad, Anotaciones
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneMath from 'cornerstone-math';
import Hammer from 'hammerjs';
import dicomParser from 'dicom-parser';

/* ─── Inicialización única ──────────────────────────────────── */
let csInit = false;
function initCS() {
    if (csInit) return true;
    try {
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        cornerstoneWADOImageLoader.configure({ useWebWorkers: false });

        cornerstoneTools.external.cornerstone = cornerstone;
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
        cornerstoneTools.external.Hammer = Hammer;
        cornerstoneTools.init({ showSVGCursors: false, preventAntiAliasing: false });

        csInit = true;
        return true;
    } catch (e) {
        console.error('Cornerstone init:', e);
        return false;
    }
}

/* ─── Herramientas disponibles ──────────────────────────────── */
const TOOLS = [
    { id: 'Wwwc', icon: '☀️', label: 'W/L', tip: 'Brillo / Contraste' },
    { id: 'Zoom', icon: '🔍', label: 'Zoom', tip: 'Zoom con arrastre' },
    { id: 'Pan', icon: '✋', label: 'Pan', tip: 'Mover imagen' },
    { id: 'Length', icon: '📏', label: 'Longitud', tip: 'Medir distancia' },
    { id: 'RectangleRoi', icon: '⬜', label: 'ROI', tip: 'Región de interés' },
    { id: 'Angle', icon: '📐', label: 'Ángulo', tip: 'Medir ángulo' },
    { id: 'EllipticalRoi', icon: '⭕', label: 'Elipse', tip: 'ROI elíptica' },
    { id: 'Probe', icon: '📌', label: 'HU', tip: 'Valor Hounsfield' },
    { id: 'ArrowAnnotate', icon: '➡️', label: 'Nota', tip: 'Añadir anotación' },
    { id: 'Eraser', icon: '🗑', label: 'Borrar', tip: 'Borrar medición' },
];

/* ─── Presets clínicos WW/WL ────────────────────────────────── */
const WL_PRESETS = [
    { label: 'Pulmón', ww: 1500, wc: -600 },
    { label: 'Hueso', ww: 2000, wc: 400 },
    { label: 'Cerebro', ww: 80, wc: 40 },
    { label: 'Abdomen', ww: 350, wc: 60 },
    { label: 'Hígado', ww: 150, wc: 60 },
    { label: 'Mediastino', ww: 350, wc: 50 },
    { label: 'Columna', ww: 1800, wc: 400 },
    { label: 'Auto', ww: null, wc: null },
];

/* ─── Helper: normalizar URL ────────────────────────────────── */
function normUrl(img) {
    if (!img) return '';
    const raw = typeof img === 'string' ? img : (img.url || img.path || img.src || '');
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http')) return raw;
    return '/' + raw.replace(/^\/+/, '');
}

/* ─── Registrar herramientas (una sola vez por sesión) ──────── */
let toolsRegistered = false;
function registerTools() {
    if (toolsRegistered) return;
    TOOLS.forEach(t => {
        try {
            const C = cornerstoneTools[t.id + 'Tool'];
            if (C) cornerstoneTools.addTool(C);
        } catch (_) { }
    });
    toolsRegistered = true;
}

/* ═══════════════════ COMPONENTE ════════════════════════════════ */
const DicomViewer = ({ imagenes = [], ajustesIniciales = {}, onCambioAjustes = null, estiloContenedor = {} }) => {
    const containerRef = useRef(null); // div con dimensiones reales
    const [ready, setReady] = useState(false);
    const [tool, setTool] = useState('Wwwc');
    const [idx, setIdx] = useState(0);
    const [flipH, setFlipH] = useState(ajustesIniciales.flipH || false);
    const [flipV, setFlipV] = useState(ajustesIniciales.flipV || false);
    const [invert, setInvert] = useState(ajustesIniciales.invertido || false);
    const [rot, setRot] = useState(ajustesIniciales.rotacion || 0);
    const [info, setInfo] = useState({ ww: ajustesIniciales.ww || 0, wc: ajustesIniciales.wc || 0, zoom: ajustesIniciales.zoom || '1.00', x: 0, y: 0, hu: '' });
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    /* ── Habilitar Cornerstone cuando el elemento tiene tamaño ── */
    useEffect(() => {
        const ok = initCS();
        if (!ok) { setErr('Error iniciando Cornerstone. Refresque la página.'); return; }

        const el = containerRef.current;
        if (!el) return;

        // Esperar a que el elemento tenga dimensiones reales
        const tryEnable = () => {
            if (el.offsetWidth < 10 || el.offsetHeight < 10) return; // aún sin tamaño
            try {
                cornerstone.enable(el);
                registerTools();
                setReady(true);
            } catch (e) {
                setErr('No se pudo inicializar el visor: ' + e.message);
            }
        };

        // Intentar inmediatamente y con ResizeObserver si el tamaño no está listo
        tryEnable();
        const ro = new ResizeObserver(() => {
            if (!ready) tryEnable();
        });
        ro.observe(el);

        return () => {
            ro.disconnect();
            try { cornerstone.disable(el); } catch (_) { }
        };
    }, []); // eslint-disable-line

    /* ── Cargar imagen cuando cambia índice ──────────────────── */
    useEffect(() => {
        if (!ready || !imagenes.length) return;
        loadImage(imagenes[idx]);
    }, [ready, idx, imagenes]); // eslint-disable-line

    const loadImage = useCallback(async (imgData) => {
        const el = containerRef.current;
        if (!el || !imgData) return;
        setLoading(true); setErr('');
        const url = normUrl(imgData);
        const fullUrl = url.startsWith('http') ? url : window.location.origin + url;

        // Intentar como DICOM primero, luego como imagen web
        const ids = [
            'wadouri:' + fullUrl,
            'webImageLoader:' + fullUrl,
        ];
        for (const imageId of ids) {
            try {
                const image = await cornerstone.loadAndCacheImage(imageId);
                cornerstone.displayImage(el, image);
                // Aplicar viewport current o inicial
                const vp = cornerstone.getViewport(el);
                if (vp) {
                    vp.invert = invert;
                    vp.rotation = rot;
                    vp.hflip = flipH;
                    vp.vflip = flipV;
                    // Aplicar WW/WC inicial si existe
                    if (ajustesIniciales.ww) {
                        vp.voi.windowWidth = ajustesIniciales.ww;
                        vp.voi.windowCenter = ajustesIniciales.wc;
                    }
                    if (ajustesIniciales.zoom && ajustesIniciales.zoom !== '1.00') {
                        vp.scale = parseFloat(ajustesIniciales.zoom);
                    }
                    cornerstone.setViewport(el, vp);
                    cornerstone.updateImage(el);
                    setInfo(p => ({
                        ...p,
                        ww: Math.round(vp.voi?.windowWidth || image.windowWidth || 0),
                        wc: Math.round(vp.voi?.windowCenter || image.windowCenter || 0),
                        zoom: (vp.scale || 1).toFixed(2),
                    }));
                }
                activateTool(tool);
                setLoading(false);
                return;
            } catch (_) { }
        }
        setErr('No se pudo cargar la imagen. Verifique que el archivo es DICOM o imagen válida.');
        setLoading(false);
    }, [ready, invert, rot, flipH, flipV, tool, ajustesIniciales]); // eslint-disable-line

    /* ── Activar herramienta ─────────────────────────────────── */
    const activateTool = (tid) => {
        const el = containerRef.current;
        if (!el) return;
        TOOLS.forEach(t => { try { cornerstoneTools.setToolPassiveForElement(el, t.id); } catch (_) { } });
        try { cornerstoneTools.setToolActiveForElement(el, tid, { mouseButtonMask: 1 }); } catch (_) { }
    };

    const selectTool = (tid) => { setTool(tid); activateTool(tid); };

    /* ── Aplicar cambios de viewport ──────────────────────────── */
    const applyVP = useCallback((patch) => {
        const el = containerRef.current;
        if (!el) return;
        try {
            const vp = cornerstone.getViewport(el);
            if (!vp) return;
            Object.assign(vp, patch);
            cornerstone.setViewport(el, vp);
            cornerstone.updateImage(el);

            // Notificar arriba
            if (onCambioAjustes) {
                const nWw = patch.voi ? patch.voi.windowWidth : info.ww;
                const nWc = patch.voi ? patch.voi.windowCenter : info.wc;
                const nInvert = 'invert' in patch ? patch.invert : invert;
                const nRot = 'rotation' in patch ? patch.rotation : rot;
                const nFlipH = 'hflip' in patch ? patch.hflip : flipH;
                const nFlipV = 'vflip' in patch ? patch.vflip : flipV;
                const nZoom = patch.scale ? patch.scale.toFixed(2) : info.zoom;

                onCambioAjustes({
                    ww: nWw, wc: nWc, zoom: nZoom,
                    invertido: nInvert, rotacion: nRot,
                    flipH: nFlipH, flipV: nFlipV
                });
            }
        } catch (_) { }
    }, [info.ww, info.wc, info.zoom, invert, rot, flipH, flipV, onCambioAjustes]);

    useEffect(() => { if (ready) applyVP({ invert, rotation: rot, hflip: flipH, vflip: flipV }); },
        [invert, rot, flipH, flipV]); // eslint-disable-line

    /* EVENTOS DE CORNERSTONE (drag ajustando brillo/contraste/zoom) */
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !ready) return;
        const onImageRendered = (e) => {
            const vp = e.detail.viewport;
            if (!vp) return;
            const newWw = Math.round(vp.voi.windowWidth);
            const newWc = Math.round(vp.voi.windowCenter);
            const newZoom = vp.scale.toFixed(2);

            // Actualizar solo si cambió
            if (newWw !== info.ww || newWc !== info.wc || newZoom !== info.zoom) {
                setInfo(p => ({ ...p, ww: newWw, wc: newWc, zoom: newZoom }));
                if (onCambioAjustes) {
                    onCambioAjustes({
                        ww: newWw, wc: newWc, zoom: newZoom,
                        invertido: invert, rotacion: rot, flipH, flipV
                    });
                }
            }
        };
        el.addEventListener('cornerstoneimagerendered', onImageRendered);
        return () => el.removeEventListener('cornerstoneimagerendered', onImageRendered);
    }, [ready, info.ww, info.wc, info.zoom, invert, rot, flipH, flipV, onCambioAjustes]);

    /* ── Acciones de viewport ────────────────────────────────── */
    const setWL = (ww, wc) => {
        if (ww === null) return; // Auto: no hacer nada
        applyVP({ voi: { windowWidth: ww, windowCenter: wc } });
        setInfo(p => ({ ...p, ww, wc }));
    };
    const zoom = (f) => { const el = containerRef.current; try { const vp = cornerstone.getViewport(el); vp.scale *= f; cornerstone.setViewport(el, vp); cornerstone.updateImage(el); setInfo(p => ({ ...p, zoom: vp.scale.toFixed(2) })); } catch (_) { } };
    const resetVP = () => {
        try {
            cornerstone.reset(containerRef.current);
            setFlipH(false); setFlipV(false); setInvert(false); setRot(0);
            if (onCambioAjustes) onCambioAjustes({ ww: null, wc: null, zoom: '1.00', invertido: false, rotacion: 0, flipH: false, flipV: false });
        } catch (_) { }
    };
    const clearMeasures = () => {
        const el = containerRef.current;
        TOOLS.forEach(t => { try { const s = cornerstoneTools.getToolState(el, t.id); if (s?.data) s.data = []; } catch (_) { } });
        try { cornerstone.updateImage(el); } catch (_) { }
    };
    /* Exponer función de captura al componente padre (usando un id fijo o ref, aquí usaremos ID temporal) */
    useEffect(() => {
        window.__capturarVisorDicomActivo = () => {
            try {
                const c = containerRef.current?.querySelector('canvas');
                return c ? c.toDataURL('image/jpeg', 0.9) : null;
            } catch (_) { return null; }
        };
        return () => { window.__capturarVisorDicomActivo = null; };
    }, []);
    const capture = () => {
        try {
            const c = containerRef.current?.querySelector('canvas');
            if (c) { const a = document.createElement('a'); a.download = `dicom-${Date.now()}.png`; a.href = c.toDataURL(); a.click(); }
        } catch (_) { }
    };

    /* ── Evento de mousemove para HU ─────────────────────────── */
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !ready) return;
        const onMove = (e) => {
            try {
                const img = cornerstone.getImage(el);
                if (!img) return;
                const r = el.getBoundingClientRect();
                const pt = cornerstone.pageToPixel(el, e.clientX - r.left, e.clientY - r.top);
                if (pt && pt.x >= 0 && pt.y >= 0 && pt.x < img.width && pt.y < img.height) {
                    const hu = img.getPixelData ? img.getPixelData()[Math.round(pt.y) * img.width + Math.round(pt.x)] : '';
                    setInfo(p => ({ ...p, x: Math.round(pt.x), y: Math.round(pt.y), hu }));
                }
            } catch (_) { }
        };
        el.addEventListener('mousemove', onMove);
        return () => el.removeEventListener('mousemove', onMove);
    }, [ready]);

    /* ── Cargar archivo local ──────────────────────────────────  */
    const loadLocalFile = (file) => {
        if (!file) return;
        const blob = URL.createObjectURL(file);
        loadImage(blob);
    };

    /* ─────────────────── RENDER ─────────────────────────────── */
    const Btn = ({ onClick, children, title, active }) => (
        <button onClick={onClick} title={title} style={{
            background: active ? '#1565c0' : 'rgba(255,255,255,0.07)',
            border: active ? '1.5px solid #82b1ff' : '1px solid rgba(255,255,255,0.1)',
            color: 'white', borderRadius: 7, padding: '6px 9px',
            cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 0.12s', whiteSpace: 'nowrap',
        }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        >{children}</button>
    );

    const Sep = () => <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.13)', margin: '0 3px' }} />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0f1a', ...estiloContenedor }}>

            {/* ── Toolbar principal ── */}
            <div style={{ padding: '7px 10px', background: '#111c2e', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {TOOLS.map(t => <Btn key={t.id} onClick={() => selectTool(t.id)} title={t.tip} active={tool === t.id}>{t.icon} {t.label}</Btn>)}
                <Sep />
                <Btn onClick={() => setRot(r => (r - 90 + 360) % 360)} title="Rotar -90°">↺</Btn>
                <Btn onClick={() => setRot(r => (r + 90) % 360)} title="Rotar +90°">↻</Btn>
                <Btn onClick={() => setFlipH(h => !h)} title="Voltear H" active={flipH}>⇄ H</Btn>
                <Btn onClick={() => setFlipV(v => !v)} title="Voltear V" active={flipV}>⇅ V</Btn>
                <Btn onClick={() => setInvert(i => !i)} title="Invertir" active={invert}>◑ Inv</Btn>
                <Sep />
                <Btn onClick={() => zoom(1.2)} title="Acercar">🔍+</Btn>
                <Btn onClick={() => zoom(1 / 1.2)} title="Alejar">🔍−</Btn>
                <Btn onClick={resetVP} title="Restablecer">⟲ Reset</Btn>
                <Btn onClick={clearMeasures} title="Borrar medidas">🗑 Medidas</Btn>
                <Btn onClick={capture} title="Captura PNG">📸</Btn>
            </div>

            {/* ── Presets WW/WL + info ── */}
            <div style={{ padding: '4px 10px', background: '#0d1826', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#82b1ff', fontSize: 11, fontWeight: 700 }}>VENTANA:</span>
                {WL_PRESETS.map(p => (
                    <button key={p.label} onClick={() => setWL(p.ww, p.wc)} style={{ padding: '3px 9px', background: 'rgba(130,177,255,0.1)', border: '1px solid rgba(130,177,255,0.25)', color: '#82b1ff', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{p.label}</button>
                ))}
                <span style={{ marginLeft: 8, color: '#666', fontSize: 11 }}>
                    WW:<strong style={{ color: '#aaa' }}>{info.ww}</strong>&nbsp;
                    WC:<strong style={{ color: '#aaa' }}>{info.wc}</strong>&nbsp;
                    Zoom:<strong style={{ color: '#aaa' }}>{info.zoom}×</strong>
                    {info.hu !== '' && <>&nbsp;HU(<strong style={{ color: '#82b1ff' }}>{info.x},{info.y}</strong>):<strong style={{ color: '#fff' }}>{info.hu}</strong></>}
                </span>
            </div>

            {/* ── Cuerpo: miniaturas + canvas ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Miniaturas */}
                <div style={{ width: 76, background: '#060c17', borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', padding: 5, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {imagenes.map((img, i) => {
                        const url = normUrl(img);
                        const isWeb = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
                        return (
                            <div key={i} onClick={() => setIdx(i)} style={{
                                border: i === idx ? '2px solid #82b1ff' : '2px solid rgba(255,255,255,0.05)',
                                borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                                background: '#111c2e', minHeight: 56,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                            }}>
                                {isWeb
                                    ? <img src={(url.startsWith('http') ? url : window.location.origin + url)} alt="" style={{ width: '100%', height: 56, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                                    : <div style={{ color: '#82b1ff', fontSize: 9, textAlign: 'center', padding: 2 }}>DICOM<br />{i + 1}</div>
                                }
                                <span style={{ position: 'absolute', bottom: 1, right: 3, color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{i + 1}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Área del canvas cornerstone */}
                <div style={{ flex: 1, position: 'relative', background: '#000' }}>
                    {loading && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                            <div style={{ color: 'white', textAlign: 'center' }}>
                                <div style={{ fontSize: 32, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
                                <div style={{ fontSize: 13 }}>Cargando imagen DICOM…</div>
                            </div>
                        </div>
                    )}
                    {err && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                            <div style={{ color: '#ef5350', fontSize: 36 }}>⚠️</div>
                            <div style={{ color: '#ef5350', maxWidth: 380, textAlign: 'center', fontSize: 13, lineHeight: 1.5 }}>{err}</div>
                            <label style={{ padding: '10px 20px', background: '#1565c0', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                                📂 Abrir archivo local
                                <input type="file" accept=".dcm,.DCM,image/*" style={{ display: 'none' }} onChange={e => loadLocalFile(e.target.files[0])} />
                            </label>
                        </div>
                    )}
                    {!err && !loading && imagenes.length === 0 && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: '#333' }}>
                            <span style={{ fontSize: 56 }}>🏥</span>
                            <span style={{ fontSize: 14 }}>Sin imágenes. Use el botón "Subir" para añadir archivos DICOM o imágenes.</span>
                        </div>
                    )}
                    {/* Elemento gestionado por Cornerstone */}
                    <div
                        ref={containerRef}
                        style={{ width: '100%', height: '100%', background: '#000' }}
                        onContextMenu={e => e.preventDefault()}
                        onWheel={e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 0.88); }}
                    />
                </div>
            </div>

            {/* ── Navegación multi-imagen ── */}
            {imagenes.length > 1 && (
                <div style={{ background: '#111c2e', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '5px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                        style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#82b1ff', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 18 }}>◀</button>
                    <span style={{ color: '#888', fontSize: 13 }}>
                        Imagen <strong style={{ color: 'white' }}>{idx + 1}</strong> / {imagenes.length}
                    </span>
                    <button onClick={() => setIdx(i => Math.min(imagenes.length - 1, i + 1))} disabled={idx === imagenes.length - 1}
                        style={{ background: 'none', border: 'none', color: idx === imagenes.length - 1 ? '#333' : '#82b1ff', cursor: idx === imagenes.length - 1 ? 'not-allowed' : 'pointer', fontSize: 18 }}>▶</button>
                </div>
            )}
        </div>
    );
};

export default DicomViewer;
