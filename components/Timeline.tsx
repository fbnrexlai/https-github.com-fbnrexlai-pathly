
import React from 'react';
import { 
  StickyNote, Heart, Trash2, MapPin, Timer, Store, 
  ChevronUp, ChevronDown, Car, Bus, Footprints, 
  ExternalLink, Phone, Coins, Loader2, GripVertical,
  CloudRain, AlertTriangle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DayPlan, Stop, TravelMode } from '../types';
import { getOpeningHoursOnDate } from '../utils/timeUtils';

interface TimelineProps {
  activeDay: DayPlan;
  activeDayId: string;
  timeline: { arrival: string, departure: string }[];
  isCalculating: boolean;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  savedPlaces: Stop[];
  onToggleSavePlace: (stop: Stop) => void;
  onDeleteStop: (dayId: string, stopId: string) => void;
  onUpdateNote: (dayId: string, stopId: string, note: string) => void;
  onUpdateDuration: (dayId: string, stopId: string, duration: number) => void;
  onMoveStop: (dayId: string, index: number, direction: 'up' | 'down') => void;
  onDragEnd: (result: DropResult) => void;
  onUpdateTransitMode: (dayId: string, stopId: string, mode: TravelMode) => void;
  onOpenMap: (origin: Stop, dest: Stop) => void;
  weatherConflicts?: Record<string, string>;
}

export const Timeline: React.FC<TimelineProps> = ({
  activeDay,
  activeDayId,
  timeline,
  isCalculating,
  editingNoteId,
  setEditingNoteId,
  savedPlaces,
  onToggleSavePlace,
  onDeleteStop,
  onUpdateNote,
  onUpdateDuration,
  onMoveStop,
  onDragEnd,
  onUpdateTransitMode,
  onOpenMap,
  weatherConflicts = {}
}) => {
  return (
    <div className="space-y-0 relative max-w-full pb-10">
      {activeDay.stops.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
          <p className="text-slate-400 dark:text-slate-500 text-xs">尚無安排，開始搜尋並加入景點吧！</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="timeline-stops">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-0"
              >
                {activeDay.stops.map((stop, index) => {
                  const currentHours = getOpeningHoursOnDate(stop.openingHours, activeDay.date);
                  const isEditingNote = editingNoteId === stop.id;
                  const isLastStop = index === activeDay.stops.length - 1;
                  const weatherWarning = weatherConflicts[stop.id];
                  
                  return (
                    <Draggable key={stop.id} draggableId={stop.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative max-w-full outline-none transition-all ${
                            snapshot.isDragging ? 'z-[100] scale-[1.02]' : ''
                          }`}
                        >
                          {/* 
                              Structure: 
                              Container (relative)
                               -> Line (absolute, height-managed via top/bottom)
                               -> Time (absolute, top-aligned)
                               -> Content Wrapper (pl-12 to push content right)
                          */}
                          
                          {/* The Continuous Vertical Line */}
                          {/* 
                             Logic:
                             - If First Stop: Start from center of marker (top-6) to bottom.
                             - If Last Stop: Start from top to center of marker (h-6).
                             - Middle Stop: Start from top to bottom (marker covers the overlap).
                          */}
                          <div 
                             className={`absolute left-[19px] w-[2px] bg-slate-200 dark:bg-slate-700 transition-colors z-0
                               ${index === 0 ? 'top-[26px] bottom-0' : ''}
                               ${isLastStop ? 'top-0 h-[26px]' : ''}
                               ${index > 0 && !isLastStop ? 'top-0 bottom-0' : ''}
                               ${snapshot.isDragging ? 'opacity-0' : ''}
                             `}
                          />

                          {/* Time Marker */}
                          <div className="absolute left-0 top-1 w-10 z-10 flex justify-center">
                            <div className="w-10 h-11 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shadow-sm transition-colors ring-1 ring-black/5 dark:ring-white/5">
                              <span className="text-[10.5px] font-black text-blue-600 dark:text-blue-400 leading-none">{timeline[index]?.arrival}</span>
                              <div className="w-5 h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-none">{timeline[index]?.departure}</span>
                            </div>
                          </div>

                          {/* Content Column */}
                          {/* Use pb-4 on the wrapper to create space for the next item, ensuring the line spans this gap */}
                          <div className={`pl-12 pr-1 ${isLastStop ? '' : 'pb-4'}`}>
                            
                            {/* Stop Card */}
                            <div className={`w-full bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border transition-all flex items-start gap-2 relative z-10 ${
                              snapshot.isDragging 
                                ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/10' 
                                : weatherWarning 
                                  ? 'border-amber-300 dark:border-amber-700/50 shadow-md ring-1 ring-amber-100 dark:ring-amber-900/20' 
                                  : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
                            }`}>
                              <div 
                                {...provided.dragHandleProps}
                                className="self-stretch flex items-center px-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[14px] truncate">{stop.name}</h4>
                                    {weatherWarning && (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800/50 flex-shrink-0 animate-pulse transition-colors">
                                        <CloudRain className="w-3 h-3" />
                                        <span className="text-[9px] font-black hidden lg:inline tracking-tight">雨天警報</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button onClick={() => setEditingNoteId(isEditingNote ? null : stop.id)} className={`p-1 rounded transition-colors ${stop.note ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-300 dark:text-slate-600 hover:text-blue-400'}`} title="備註"><StickyNote className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => onToggleSavePlace(stop)} className={`p-1 rounded transition-colors ${savedPlaces.some(p => p.placeId === stop.placeId) ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-slate-300 dark:text-slate-600 hover:text-red-400'}`}><Heart className={`w-3.5 h-3.5 ${savedPlaces.some(p => p.placeId === stop.placeId) ? 'fill-current' : ''}`} /></button>
                                    <button onClick={() => onDeleteStop(activeDayId, stop.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>

                                <p className="text-slate-400 dark:text-slate-500 text-[10px] truncate pr-1 flex items-center gap-1 mt-0.5 mb-1.5"><MapPin className="w-2.5 h-2.5 flex-shrink-0" /> {stop.address}</p>
                                
                                {stop.phoneNumber && (
                                  <p className="text-blue-500 dark:text-blue-400 text-[10px] truncate pr-1 flex items-center gap-1 mt-0 mb-1.5">
                                    <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                                    <a href={`tel:${stop.phoneNumber}`} className="hover:underline truncate">{stop.phoneNumber}</a>
                                  </p>
                                )}

                                {(stop.note || isEditingNote) && (
                                  <div className="mt-1.5 mb-2.5">
                                    {isEditingNote ? (
                                      <textarea
                                        autoFocus
                                        value={stop.note}
                                        onChange={(e) => onUpdateNote(activeDayId, stop.id, e.target.value)}
                                        onBlur={() => setEditingNoteId(null)}
                                        placeholder="輸入備註..."
                                        className="w-full text-[11px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[50px] resize-none dark:text-slate-200"
                                      />
                                    ) : (
                                      <div className="p-2 bg-blue-50/40 dark:bg-blue-900/20 border-l-2 border-blue-500 rounded-r-lg">
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic break-words line-clamp-2 leading-relaxed">"{stop.note}"</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1.5 px-1.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-md text-[10px]">
                                    <Timer className="w-3 h-3 text-slate-400" />
                                    <select 
                                      value={stop.stayDuration} 
                                      onChange={(e) => onUpdateDuration(activeDayId, stop.id, parseInt(e.target.value))} 
                                      className="font-bold bg-transparent outline-none cursor-pointer text-slate-600 dark:text-slate-300"
                                    >
                                      {[15,30,45,60,90,120,180,240].map(v => <option key={v} value={v} className="text-slate-900">{v < 60 ? `${v}m` : `${v/60}h`}</option>)}
                                    </select>
                                  </div>
                                  {currentHours && <div className="flex items-center gap-1.5 px-1.5 py-1 bg-blue-50/50 dark:bg-blue-900/30 border border-blue-100/50 dark:border-blue-800/50 rounded-md text-[10px] font-bold text-slate-500 dark:text-slate-300 whitespace-nowrap"><Store className="w-3 h-3 text-blue-400" /><span>{currentHours}</span></div>}
                                  {stop.businessStatus === 'CLOSED_TEMPORARILY' && <span className="text-[9px] bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-1.5 py-1 rounded-md font-black border border-red-100 dark:border-red-900 whitespace-nowrap">暫停營業</span>}
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-0.5 self-center border-l border-slate-50 dark:border-slate-800 pl-2 flex-shrink-0">
                                <button disabled={index === 0} onClick={() => onMoveStop(activeDayId, index, 'up')} className="p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-10 transition-colors"><ChevronUp className="w-5 h-5" /></button>
                                <button disabled={isLastStop} onClick={() => onMoveStop(activeDayId, index, 'down')} className="p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-10 transition-colors"><ChevronDown className="w-5 h-5" /></button>
                              </div>
                            </div>

                            {/* Transit / Link Section Between Stops */}
                            {!isLastStop && !snapshot.isDragging && (
                              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto hide-scrollbar relative z-10">
                                {isCalculating && !stop.transitToNext ? (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm animate-pulse">
                                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">計算路徑中...</span>
                                  </div>
                                ) : stop.transitToNext ? (
                                  <>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm whitespace-nowrap">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                          {stop.transitToNext.mode === TravelMode.DRIVING ? <Car className="w-3.5 h-3.5 text-slate-400" /> : stop.transitToNext.mode === TravelMode.TRANSIT ? <Bus className="w-3.5 h-3.5 text-slate-400" /> : <Footprints className="w-3.5 h-3.5 text-slate-400" />}
                                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{stop.transitToNext.duration.replace('mins', 'm')}</span>
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">({stop.transitToNext.distance})</span>
                                        </div>
                                        
                                        {stop.transitToNext.fareDisplay && (
                                          <div className="flex items-center gap-1.5 px-2 border-l border-slate-100 dark:border-slate-700">
                                            <Coins className="w-3 h-3 text-amber-500" />
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white">{stop.transitToNext.fareDisplay}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex gap-1 border-l border-slate-100 dark:border-slate-700 pl-2 ml-1">
                                        {[TravelMode.DRIVING, TravelMode.TRANSIT, TravelMode.WALKING].map(m => (
                                          <button 
                                            key={m} 
                                            onClick={() => onUpdateTransitMode(activeDayId, stop.id, m as TravelMode)} 
                                            className={`p-1.5 rounded-md transition-all ${stop.transitToNext?.mode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'}`}
                                          >
                                            {m === TravelMode.DRIVING ? <Car className="w-3.5 h-3.5" /> : m === TravelMode.TRANSIT ? <Bus className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <button onClick={() => onOpenMap(stop, activeDay.stops[index + 1])} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all"><ExternalLink className="w-3.5 h-3.5" /></button>
                                  </>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};
