import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text, Transformer } from 'react-konva';

const TOOLS = [
    { id: 'select', label: '↖ Seç' },
    { id: 'draw', label: '✏ Çiz' },
    { id: 'garrison', label: '⬡ Garrison' },
    { id: 'attack', label: '→ Saldırı' },
    { id: 'defend', label: '⛨ Savunma' },
    { id: 'text', label: 'T Metin' },
];

const COLORS = ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#ffffff', '#f97316'];

export default function MapEditor({ mapName, onBack }) {
    const [tool, setTool] = useState('draw');
    const [color, setColor] = useState('#facc15');
    const [elements, setElements] = useState([]);
    const [lines, setLines] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mapImage, setMapImage] = useState(null);
    const currentLine = useRef([]);
    const stageRef = useRef(null);

    const stageWidth = window.innerWidth - 280;
    const stageHeight = window.innerHeight - 80;

    // Harita görselini yükle
    useEffect(() => {
        const img = new window.Image();
        img.src = `/maps/${mapName.toLowerCase().replace(/ /g, '_')}.webp`;
        img.onload = () => setMapImage(img);
    }, [mapName]);

    const handleMouseDown = (e) => {
        if (tool === 'draw') {
            setIsDrawing(true);
            const pos = e.target.getStage().getPointerPosition();
            currentLine.current = [pos.x, pos.y];
        }

        if (tool === 'garrison' || tool === 'attack' || tool === 'defend') {
            const pos = e.target.getStage().getPointerPosition();
            setElements(prev => [...prev, {
                id: Date.now(),
                type: tool,
                x: pos.x,
                y: pos.y,
                color,
            }]);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || tool !== 'draw') return;
        const pos = e.target.getStage().getPointerPosition();
        currentLine.current = [...currentLine.current, pos.x, pos.y];
        setLines(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
                points: currentLine.current,
                color,
                id: Date.now(),
            };
            return updated;
        });
    };

    const handleMouseUp = () => {
        if (isDrawing) {
            setIsDrawing(false);
            setLines(prev => [...prev, {
                points: currentLine.current,
                color,
                id: Date.now(),
            }]);
            currentLine.current = [];
        }
    };

    const clearAll = () => {
        setElements([]);
        setLines([]);
    };

    const renderElement = (el) => {
        if (el.type === 'garrison') {
            return (
                <Circle
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    radius={14}
                    fill={el.color}
                    opacity={0.85}
                    stroke="#000"
                    strokeWidth={1.5}
                />
            );
        }
        if (el.type === 'attack') {
            return (
                <Text
                    key={el.id}
                    x={el.x - 12}
                    y={el.y - 12}
                    text="→"
                    fontSize={28}
                    fill={el.color}
                />
            );
        }
        if (el.type === 'defend') {
            return (
                <Text
                    key={el.id}
                    x={el.x - 12}
                    y={el.y - 12}
                    text="⛨"
                    fontSize={24}
                    fill={el.color}
                />
            );
        }
        return null;
    };

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">

            {/* Sol panel */}
            <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col p-4 gap-4">

                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                >
                    ← Geri
                </button>

                <div>
                    <p className="text-yellow-400 font-bold uppercase tracking-widest text-xs mb-1">Harita</p>
                    <p className="text-white font-semibold">{mapName}</p>
                </div>

                {/* Araçlar */}
                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Araçlar</p>
                    <div className="flex flex-col gap-2">
                        {TOOLS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTool(t.id)}
                                className={`px-3 py-2 rounded text-sm text-left transition-all ${tool === t.id
                                    ? 'bg-yellow-500 text-black font-semibold'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Renkler */}
                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Renk</p>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Temizle */}
                <button
                    onClick={clearAll}
                    className="mt-auto px-3 py-2 bg-red-900 hover:bg-red-700 text-red-200 rounded text-sm"
                >
                    🗑 Tümünü Temizle
                </button>
            </div>

            {/* Canvas alanı */}
            <div className="flex-1 overflow-hidden cursor-crosshair">
                <Stage
                    ref={stageRef}
                    width={stageWidth}
                    height={stageHeight}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    <Layer>
                        {/* Harita görseli */}
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
                                <KonvaImage
                                    image={mapImage}
                                    x={offsetX}
                                    y={offsetY}
                                    width={drawW}
                                    height={drawH}
                                    opacity={0.9}
                                />
                            );
                        })()}

                        {/* Çizgiler */}
                        {lines.map((line, i) => (
                            <Line
                                key={i}
                                points={line.points}
                                stroke={line.color}
                                strokeWidth={3}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                                globalCompositeOperation="source-over"
                            />
                        ))}

                        {/* Elementler */}
                        {elements.map(el => renderElement(el))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
}