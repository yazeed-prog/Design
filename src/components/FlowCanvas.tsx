import { ChevronDown, Plus, Wrench, Zap, ZoomIn, ZoomOut, Maximize2, Hand, Clock, Sparkles, StickyNote } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AppSelector } from './AppSelector';
import { motion } from 'framer-motion';

interface Step {
  id: string;
  appId: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface FlowCanvasProps {
  selectedCardId: string | null;
  onCardSelect: (id: string | null) => void;
  steps: Step[];
  onStepsChange: (steps: Step[]) => void;
  isSidebarOpen?: boolean;
  onCanvasDimensionsChange?: (dimensions: { width: number; height: number; top: number; left: number }) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
  aiHasNewMessage?: boolean;
  onOpenAIChat?: () => void;
  isAIChatOpen?: boolean;
}

export function FlowCanvas({ selectedCardId, onCardSelect, steps, onStepsChange, isSidebarOpen = false, onCanvasDimensionsChange, onPanChange, aiHasNewMessage = false, onOpenAIChat, isAIChatOpen = false }: FlowCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [targetZoom, setTargetZoom] = useState(1);
  const [targetPan, setTargetPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0, time: 0 });
  const animationFrame = useRef<number>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(null);
  const addButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevStepsCountRef = useRef(steps.length);
  const isAddingStepRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const sidebarStateInitialized = useRef(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const aiAssistantButtonRef = useRef<HTMLButtonElement>(null);
  
  // Auto-center to start of flow on initial load
  useEffect(() => {
    if (!hasInitializedRef.current && canvasRef.current) {
      hasInitializedRef.current = true;
      const centerX = 0; // Center the flow horizontally
      const startY = 0; // Start from (0, 0)
      
      setPan({ x: centerX, y: startY });
      setTargetPan({ x: centerX, y: startY });
      
      // Mark sidebar state as initialized to prevent adjustment on first render
      setTimeout(() => {
        sidebarStateInitialized.current = true;
      }, 100);
    }
  }, []);
  
  // Calculate and report canvas dimensions
  useEffect(() => {
    if (canvasRef.current && onCanvasDimensionsChange) {
      const updateDimensions = () => {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          onCanvasDimensionsChange({
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [onCanvasDimensionsChange, isSidebarOpen]);
  
  // Track sidebar state changes and adjust pan to keep flow centered
  useEffect(() => {
    // Disabled: Keep pan at X=0 regardless of sidebar state
    return;
    
    // Skip adjustment on initial load
    if (!hasInitializedRef.current || !sidebarStateInitialized.current) return;
    
    const offset = 320 / 2;
    
    // Only adjust pan if the sidebar state changed without adding a new step
    const stepsCountChanged = prevStepsCountRef.current !== steps.length;
    
    if (stepsCountChanged) {
      isAddingStepRef.current = true;
      prevStepsCountRef.current = steps.length;
    }
    
    if (!stepsCountChanged) {
      setTargetPan(current => ({
        x: current.x + (isSidebarOpen ? -offset : offset),
        y: current.y
      }));
    }
  }, [isSidebarOpen, steps.length]);
  
  // Smoothly scroll to new card when added
  useEffect(() => {
    if (isAddingStepRef.current && steps.length > 0) {
      isAddingStepRef.current = false;
      
      // Calculate the position to scroll to show the new card
      // Each card is ~100px height + spacing, adjust pan to show the bottom of the flow
      const CARD_HEIGHT = 100;
      const SPACING = 72; // height of add button sections
      const flowHeight = (steps.length + 1) * (CARD_HEIGHT + SPACING);
      
      // Smoothly pan down to show new card (if needed)
      setTargetPan(current => ({
        x: current.x,
        y: Math.min(current.y, -200 - (steps.length * 80)) // Adjust based on new step count
      }));
    }
  }, [steps.length, steps]);
  
  // Report pan changes to parent
  useEffect(() => {
    if (onPanChange) {
      onPanChange(pan);
    }
  }, [pan.x, pan.y, onPanChange]);
  
  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      // Smooth zoom interpolation - faster
      setZoom(current => {
        const diff = targetZoom - current;
        if (Math.abs(diff) < 0.001) return targetZoom;
        return current + diff * 0.3;
      });

      // Smooth pan interpolation - faster and more responsive
      setPan(current => {
        const diffX = targetPan.x - current.x;
        const diffY = targetPan.y - current.y;
        
        if (Math.abs(diffX) < 0.1 && Math.abs(diffY) < 0.1) {
          return targetPan;
        }
        
        return {
          x: current.x + diffX * 0.4,
          y: current.y + diffY * 0.4
        };
      });

      // Apply momentum when not dragging - stronger momentum
      if (!isDragging && (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1)) {
        setTargetPan(current => ({
          x: current.x + velocity.x,
          y: current.y + velocity.y
        }));
        setVelocity(current => ({
          x: current.x * 0.95,
          y: current.y * 0.95
        }));
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [targetZoom, targetPan, isDragging, velocity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow space in input/textarea elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Allow space in input/textarea elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsDragging(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Check if it's a pinch gesture (ctrl/cmd key) for zooming
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY * -0.015;
        // Use functional state update to access latest state without dependency issues if possible, 
        // but here we need targetZoom. We can use a ref or include it in dependency array.
        // However, adding it to dependency array causes re-binding.
        // Let's use the setTargetZoom callback form to get current value if we don't have it,
        // but here we need to clamp based on current value.
        
        setTargetZoom(current => Math.min(Math.max(0.25, current + delta), 2));
      } else {
        // Otherwise, pan the canvas with smooth scrolling - increased sensitivity
        const sensitivity = 1.5;
        setTargetPan(current => ({
          x: current.x - e.deltaX * sensitivity,
          y: current.y - e.deltaY * sensitivity
        }));
        setVelocity({ x: 0, y: 0 }); // Reset velocity on wheel
      }
    };

    element.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning with middle mouse button or left click + space
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - targetPan.x, y: e.clientY - targetPan.y });
      setVelocity({ x: 0, y: 0 });
      lastPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newPan = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      // Direct update for instant feedback
      setTargetPan(newPan);
      setPan(newPan);
      
      // Calculate velocity for momentum - increased multiplier for faster momentum
      const now = Date.now();
      const dt = now - lastPos.current.time;
      if (dt > 0) {
        setVelocity({
          x: (e.clientX - lastPos.current.x) / dt * 20,
          y: (e.clientY - lastPos.current.y) / dt * 20
        });
      }
      lastPos.current = { x: e.clientX, y: e.clientY, time: now };
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      setIsDragging(false);
    }
  };

  const handleZoomIn = () => {
    setTargetZoom(Math.min(targetZoom + 0.25, 2));
  };

  const handleZoomOut = () => {
    setTargetZoom(Math.max(targetZoom - 0.25, 0.25));
  };

  const handleResetView = () => {
    setTargetZoom(1);
    setTargetPan({ x: 0, y: 0 });
    setVelocity({ x: 0, y: 0 });
  };

  const renderAddButton = (buttonIndex: number, insertAtIndex: number) => (
    <div className="flex flex-col items-center relative">
      <div className="w-0.5 h-12 bg-gray-300"></div>
      <button 
        ref={el => addButtonRefs.current[buttonIndex] = el}
        onClick={(e) => {
          e.stopPropagation();
          setActiveButtonIndex(buttonIndex);
        }}
        onMouseEnter={() => setHoveredButton(`add-${buttonIndex}`)}
        onMouseLeave={() => setHoveredButton(null)}
        className="w-8 h-8 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-[hsl(257,74%,62%)] hover:bg-[hsl(257,74%,97%)] transition-colors group -my-4 z-10"
      >
        <Plus className="text-gray-500 group-hover:text-[hsl(257,74%,57%)]" size={16} />
      </button>
      <div className="w-0.5 h-12 bg-gray-300"></div>
      
      {/* App Selector Popover */}
      {activeButtonIndex === buttonIndex && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setActiveButtonIndex(null);
            }}
          />
          
          {/* Popover */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 z-[9999]"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <AppSelector 
              onSelect={(app) => {
                const newStep: Step = {
                  id: `${app.id}-${Date.now()}`,
                  appId: app.id,
                  name: app.name,
                  icon: app.icon,
                  color: app.color
                };
                // Insert step at the correct position
                const newSteps = [...steps];
                newSteps.splice(insertAtIndex, 0, newStep);
                onStepsChange(newSteps);
                // Select the newly added step
                onCardSelect(newStep.id);
                setActiveButtonIndex(null);
              }}
              onClose={() => setActiveButtonIndex(null)}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="flex-1 overflow-hidden bg-gray-50 relative select-none overscroll-none">
      <div 
        ref={canvasRef}
        className={`h-full flex items-center justify-center p-8 ${
          spacePressed ? 'cursor-grab' : 'cursor-default'
        } ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          // Close selector when clicking on canvas
          if (activeButtonIndex !== null && e.target === e.currentTarget) {
            setActiveButtonIndex(null);
          }
        }}
      >
        {/* Dotted Background Layer - Moves with zoom and pan */}
        <div
          className="absolute pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            backgroundImage: 'radial-gradient(circle, #b5bac1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            willChange: isDragging ? 'transform' : 'auto',
            width: '400vw',
            height: '400vh',
            left: '50%',
            top: '50%',
            marginLeft: '-200vw',
            marginTop: '-200vh'
          }}
        />
        
        <div 
          className="w-[300px] flex-shrink-0 pointer-events-auto"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            willChange: isDragging ? 'transform' : 'auto'
          }}
        >
          {/* Complete Step Banner */}
          <div className="flex justify-center mb-6">
            <div className="px-5 py-2.5 bg-yellow-50 border border-yellow-200 rounded-full">
              <p className="text-sm text-yellow-800">Complete 1 step</p>
            </div>
          </div>

          {/* Trigger with Label - Grouped for hover/select effects */}
          <div className="group">
            {/* Trigger Label */}
            <div className="p-[0px]">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border rounded-tl-lg rounded-tr-lg border-b-0 transition-all ${
                selectedCardId === 'trigger' 
                  ? 'border-[hsl(257,74%,57%)] outline outline-1 outline-[hsl(257,74%,57%)]' 
                  : 'border-gray-200 group-hover:border-gray-300 group-hover:outline group-hover:outline-1 group-hover:outline-gray-300'
              }`}>
                <Zap size={14} className={selectedCardId === 'trigger' ? 'text-[hsl(257,74%,57%)]' : 'text-gray-500'} />
                <span className={`text-xs font-medium ${selectedCardId === 'trigger' ? 'text-[hsl(257,74%,57%)]' : 'text-gray-600'}`}>Trigger</span>
              </div>
            </div>

            {/* Trigger Card */}
            <div className={`bg-white rounded-tr-xl rounded-br-xl rounded-bl-xl border transition-all ${
              selectedCardId === 'trigger' 
                ? 'border-[hsl(257,74%,57%)] outline outline-1 outline-[hsl(257,74%,57%)]' 
                : 'border-gray-200 group-hover:border-gray-300 group-hover:outline group-hover:outline-1 group-hover:outline-gray-300'
            }`}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onCardSelect('trigger');
                }}
                className="w-full p-4 flex items-center gap-4 text-left rounded-tr-xl rounded-br-xl rounded-bl-xl"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center shrink-0">
                  <Wrench className="text-white" size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base text-gray-900">Catch Webhook</h3>
                  </div>
                  <p className="text-sm text-gray-500">Waiting for webhook...</p>
                </div>

                {/* Dropdown Arrow */}
                <div className="shrink-0">
                  <ChevronDown className="text-gray-400" size={20} />
                </div>
              </button>
            </div>
          </div>

          {/* Add button after Trigger */}
          {renderAddButton(0, 0)}

          {/* Dynamic Steps */}
          {steps.map((step, index) => (
            <div key={step.id}>
              {/* Step Card */}
              <div className="bg-white rounded-xl border border-gray-200">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onCardSelect(step.id);
                  }}
                  className={`w-full p-4 flex items-center gap-4 text-left rounded-xl transition-all ${
                    selectedCardId === step.id 
                      ? 'outline outline-1 outline-[hsl(257,74%,57%)]' 
                      : 'hover:outline hover:outline-1 hover:outline-gray-300'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 ${step.color} rounded-lg flex items-center justify-center shrink-0 text-white`}>
                    {step.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base text-gray-900">{index + 2}. {step.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${aiHasNewMessage && selectedCardId === step.id ? 'text-[hsl(257,74%,57%)]' : 'text-gray-500'}`}>
                        {aiHasNewMessage && selectedCardId === step.id ? '1 message' : 'Configure this step'}
                      </p>
                    </div>
                  </div>

                  {/* Dropdown Arrow */}
                  <div className="shrink-0">
                    <ChevronDown className="text-gray-400" size={20} />
                  </div>
                </button>
              </div>

              {/* Add button after each step */}
              {renderAddButton(index + 1, index + 1)}
            </div>
          ))}

          {/* End Label */}
          <div className="flex justify-center">
            <div className="px-6 py-2 bg-gray-100 rounded-full">
              <p className="text-sm text-gray-600">End</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-row items-center p-1 gap-0.5 z-[55]">
        <div 
          className="relative"
          onMouseEnter={() => setHoveredButton('ai-assistant')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            ref={aiAssistantButtonRef}
            className="p-2.5 hover:bg-gray-50 transition-colors rounded-l-md relative"
            onClick={onOpenAIChat}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="sparklesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                  <stop offset="50%" stopColor="rgb(168, 85, 247)" />
                  <stop offset="100%" stopColor="rgb(253, 164, 175)" />
                </linearGradient>
              </defs>
            </svg>
            <motion.div
              animate={{
                filter: [
                  'drop-shadow(0 0 0px rgba(168, 85, 247, 0))',
                  'drop-shadow(0 0 14px rgba(168, 85, 247, 0.9))',
                  'drop-shadow(0 0 0px rgba(168, 85, 247, 0))'
                ],
                scale: [1, 1.3, 1]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 1.4,
                ease: "easeInOut"
              }}
            >
              <Sparkles size={18} style={{ stroke: 'url(#sparklesGradient)' }} />
            </motion.div>
          </button>
          {hoveredButton === 'ai-assistant' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              AI Assistant
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-300"></div>
        <div 
          className="relative"
          onMouseEnter={() => setHoveredButton('zoom-out')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-gray-50 transition-colors"
          >
            <ZoomOut size={18} className="text-gray-700" />
          </button>
          {hoveredButton === 'zoom-out' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              Zoom Out
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
        <div className="px-4 py-1.5">
          <p className="text-xs text-gray-600">{Math.round(zoom * 100)}%</p>
        </div>
        <div 
          className="relative"
          onMouseEnter={() => setHoveredButton('zoom-in')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-gray-50 transition-colors"
          >
            <ZoomIn size={18} className="text-gray-700" />
          </button>
          {hoveredButton === 'zoom-in' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              Zoom In
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
        <div 
          className="relative"
          onMouseEnter={() => setHoveredButton('reset-view')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            onClick={handleResetView}
            className="p-2.5 hover:bg-gray-50 transition-colors"
          >
            <Maximize2 size={18} className="text-gray-700" />
          </button>
          {hoveredButton === 'reset-view' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              Reset View
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
        <div 
          className="relative"
          onMouseEnter={() => setHoveredButton('pan-mode')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            className="p-2.5 bg-[hsl(257,74%,57%)] hover:bg-[hsl(257,74%,47%)] transition-colors rounded-md"
          >
            <Hand size={18} className="text-white" />
          </button>
          {hoveredButton === 'pan-mode' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              Pan Mode (Hold Space)
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
        <div 
          className="relative"
          onMouseEnter={() => setHoveredButton('sticky-note')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            className="p-2.5 hover:bg-gray-50 transition-colors rounded-md"
          >
            <StickyNote size={18} className="text-gray-700" />
          </button>
          {hoveredButton === 'sticky-note' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
              Add Note
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
      </div>

      {/* Space Bar Hint */}
      {spacePressed && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-lg shadow-lg px-4 py-2">
          <p className="text-xs">Click and drag to pan</p>
        </div>
      )}
    </main>
  );
}