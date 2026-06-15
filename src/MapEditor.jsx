import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text } from 'react-konva';

const TOOLS = [
    { id: 'select', label: '↖ Seç' },
    { id: 'draw', label: '✏ Çiz' },
    { id: 'garrison', label: '⬡ Garrison' },
    { id: 'attack', label: '→ Saldırı' },
    { id: 'defend', label: '⛨ Savunma' },
];

const COLORS = ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#ffffff', '#f97316'];

// Boş bir faz objesi oluşturur
function createEmptyPhase(name) {
    return {
        id: Date.now() + Math.random(),
        name,
        elements: [],
        lines: [],
        note: '',
    };
}

export default function MapEditor({ mapName, onBack }) {
    const [tool, setTool] = useState('draw');
    const [color, setColor] = useState('#facc15');
    const [isDrawing, setIsDrawing] = useState(false);
    const [mapImage, setMapImage] = useState(null);
    const [spImage, setSpImage] = useState(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const currentLine = useRef([]);
    const stageRef = useRef(null);
    const panStart = useRef({ x: 0, y: 0 });
    const panOrigin = useRef({ x: 0, y: 0 });
    const spaceDown = useRef(false);

    // Fazlar dizisi - başlangıçta 1 faz var
    const [phases, setPhases] = useState([createEmptyPhase('Faz 1')]);
    const [activePhase, setActivePhase] = useState(0);

    const stageWidth = window.innerWidth - 280;
    const stageHeight = window.innerHeight - 140;

    // Space tuşu ile geçici pan modu
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                spaceDown.current = true;
            }
        };
        const onKeyUp = (e) => { if (e.code === 'Space') spaceDown.current = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
    }, []);

    // Ekrana sığdır
    const fitToScreen = () => {
        setStageScale(1);
        setStagePos({ x: 0, y: 0 });
    };

    // Ekran koordinatını canvas koordinatına çevir
    const getCanvasPos = (e) => {
        const pos = e.target.getStage().getPointerPosition();
        return {
            x: (pos.x - stagePos.x) / stageScale,
            y: (pos.y - stagePos.y) / stageScale,
        };
    };

    // Scroll ile zoom (cursor etrafında)
    const handleWheel = (e) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        const pointer = stage.getPointerPosition();
        const scaleBy = 1.12;
        const oldScale = stageScale;
        const newScale = Math.min(Math.max(
            e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy,
            0.25
        ), 8);
        const mousePointTo = {
            x: (pointer.x - stagePos.x) / oldScale,
            y: (pointer.y - stagePos.y) / oldScale,
        };
        setStageScale(newScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    // Harita görsellerini yükle (base + strongpoint overlay)
    useEffect(() => {
        const baseName = mapName.toLowerCase().replace(/ /g, '_');

        const base = new window.Image();
        base.src = `/maps/${baseName}.webp`;
        base.onload = () => setMapImage(base);

        const sp = new window.Image();
        sp.src = `/maps/${baseName}_sp.png`;
        sp.onload = () => setSpImage(sp);
        sp.onerror = () => setSpImage(null);
    }, [mapName]);

    // Aktif fazın verisini güncelle
    const updateActivePhase = (updater) => {
        setPhases(prev => {
            const updated = [...prev];
            updated[activePhase] = { ...updated[activePhase], ...updater(updated[activePhase]) };
            return updated;
        });
    };

    const handleMouseDown = (e) => {
        const isPanTrigger = e.evt.button === 1 || spaceDown.current || tool === 'select';
        if (isPanTrigger) {
            e.evt.preventDefault();
            setIsPanning(true);
            panStart.current = { x: e.evt.clientX, y: e.evt.clientY };
            panOrigin.current = { ...stagePos };
            return;
        }

        const pos = getCanvasPos(e);

        if (tool === 'draw') {
            setIsDrawing(true);
            currentLine.current = [pos.x, pos.y];
            updateActivePhase(phase => ({
                lines: [...phase.lines, { points: [pos.x, pos.y], color, id: Date.now() }]
            }));
        }

        if (tool === 'garrison' || tool === 'attack' || tool === 'defend') {
            updateActivePhase(phase => ({
                elements: [...phase.elements, { id: Date.now(), type: tool, x: pos.x, y: pos.y, color }]
            }));
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning) {
            const dx = e.evt.clientX - panStart.current.x;
            const dy = e.evt.clientY - panStart.current.y;
            setStagePos({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
            return;
        }

        if (!isDrawing || tool !== 'draw') return;
        const pos = getCanvasPos(e);
        currentLine.current = [...currentLine.current, pos.x, pos.y];

        updateActivePhase(phase => {
            const newLines = [...phase.lines];
            newLines[newLines.length - 1] = {
                ...newLines[newLines.length - 1],
                points: currentLine.current,
            };
            return { lines: newLines };
        });
    };

    const handleMouseUp = (e) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }
        if (isDrawing) {
            setIsDrawing(false);
            currentLine.current = [];
        }
    };

    const clearCurrentPhase = () => {
        updateActivePhase(() => ({ elements: [], lines: [] }));
    };

    const addPhase = () => {
        setPhases(prev => [...prev, createEmptyPhase(`Faz ${prev.length + 1}`)]);
        setActivePhase(phases.length); // yeni faza geç
    };

    const deletePhase = (index) => {
        if (phases.length === 1) return; // en az 1 faz kalmalı
        setPhases(prev => prev.filter((_, i) => i !== index));
        if (activePhase >= index && activePhase > 0) {
            setActivePhase(activePhase - 1);
        }
    };

    const renamePhase = (index, newName) => {
        setPhases(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], name: newName };
            return updated;
        });
    };

    const updateNote = (text) => {
        updateActivePhase(() => ({ note: text }));
    };

    const renderElement = (el) => {
        if (el.type === 'garrison') {
            return (
                <Circle key={el.id} x={el.x} y={el.y} radius={14} fill={el.color}
                    opacity={0.85} stroke="#000" strokeWidth={1.5} />
            );
        }
        if (el.type === 'attack') {
            return (
                <Text key={el.id} x={el.x - 12} y={el.y - 12} text="→" fontSize={28} fill={el.color} />
            );
        }
        if (el.type === 'defend') {
            return (
                <Text key={el.id} x={el.x - 12} y={el.y - 12} text="⛨" fontSize={24} fill={el.color} />
            );
        }
        return null;
    };

    const current = phases[activePhase];

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">

            {/* Sol panel */}
            <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col p-4 gap-4">

                <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                    ← Geri
                </button>

                <div>
                    <p className="text-yellow-400 font-bold uppercase tracking-widest text-xs mb-1">Harita</p>
                    <p className="text-white font-semibold">{mapName}</p>
                </div>

                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Araçlar</p>
                    <div className="flex flex-col gap-2">
                        {TOOLS.map(t => (
                            <button key={t.id} onClick={() => setTool(t.id)}
                                className={`px-3 py-2 rounded text-sm text-left transition-all ${tool === t.id ? 'bg-yellow-500 text-black font-semibold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Renk</p>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>

                <button onClick={clearCurrentPhase}
                    className="mt-auto px-3 py-2 bg-red-900 hover:bg-red-700 text-red-200 rounded text-sm">
                    🗑 Bu Fazı Temizle
                </button>
            </div>

            {/* Sağ taraf: faz şeridi + canvas + not */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Faz şeridi */}
                <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-2 overflow-x-auto">
                    {phases.map((phase, i) => (
                        <div key={phase.id} className="flex items-center gap-1 group">
                            <button
                                onClick={() => setActivePhase(i)}
                                className={`px-4 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-all ${activePhase === i
                                    ? 'bg-yellow-500 text-black'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {phase.name}
                            </button>
                            {phases.length > 1 && (
                                <button
                                    onClick={() => deletePhase(i)}
                                    className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
                                    title="Fazı sil"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={addPhase}
                        className="px-3 py-1.5 rounded text-sm bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-dashed border-gray-600"
                    >
                        + Faz Ekle
                    </button>
                </div>

                {/* Canvas */}
                <div
                    className="flex-1 overflow-hidden relative"
                    style={{ cursor: isPanning ? 'grabbing' : tool === 'select' ? 'grab' : 'crosshair' }}
                >
                    {/* Zoom kontrolleri */}
                    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded px-3 py-1.5">
                        <button onClick={() => setStageScale(s => Math.min(s * 1.2, 8))}
                            className="text-gray-300 hover:text-white text-lg leading-none w-6 text-center">+</button>
                        <span className="text-gray-400 text-xs w-10 text-center">{Math.round(stageScale * 100)}%</span>
                        <button onClick={() => setStageScale(s => Math.max(s / 1.2, 0.25))}
                            className="text-gray-300 hover:text-white text-lg leading-none w-6 text-center">−</button>
                        <div className="w-px h-4 bg-gray-700 mx-1" />
                        <button onClick={fitToScreen}
                            className="text-gray-400 hover:text-white text-xs">Sıfırla</button>
                    </div>
                    <Stage
                        ref={stageRef}
                        width={stageWidth}
                        height={stageHeight}
                        x={stagePos.x}
                        y={stagePos.y}
                        scaleX={stageScale}
                        scaleY={stageScale}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <Layer>
                            {mapImage && (() => {
                                const ratio = mapImage.width / mapImage.height;
                                let drawW = stageHeight * ratio;
                                let drawH = stageHeight;
                                if (drawW > stageWidth) {
                                    drawW = stageWidth;
                                    drawH = stageWidth / ratio;
                                }
                                const offsetX = (stageWidth - drawW) / 2;
                                const offsetY = (stageHeight - drawH) / 2;

                                return (
                                    <>
                                        <KonvaImage image={mapImage} x={offsetX} y={offsetY} width={drawW} height={drawH} opacity={1} />
                                        {spImage && (
                                            <KonvaImage image={spImage} x={offsetX} y={offsetY} width={drawW} height={drawH} opacity={1} />
                                        )}
                                    </>
                                );
                            })()}
                            {current.lines.map((line, i) => (
                                <Line key={i} points={line.points} stroke={line.color} strokeWidth={3}
                                    tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation="source-over" />
                            ))}

                            {current.elements.map(el => renderElement(el))}
                        </Layer>
                    </Stage>
                </div>

                {/* Not alanı */}
                <div className="bg-gray-900 border-t border-gray-700 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                        <input
                            type="text"
                            value={current.name}
                            onChange={(e) => renamePhase(activePhase, e.target.value)}
                            className="bg-transparent text-yellow-400 font-semibold text-sm outline-none border-b border-transparent focus:border-yellow-500 w-32"
                        />
                        <span className="text-gray-500 text-xs">— bu faz için not</span>
                    </div>
                    <textarea
                        value={current.note}
                        onChange={(e) => updateNote(e.target.value)}
                        placeholder="Bu fazda ne yapılacak? (örn: AT timi köprüyü tutar, SL-2 garrison'u kuzeye kurar...)"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-yellow-500"
                        rows={2}
                    />
                </div>
            </div>
        </div>
    );
}