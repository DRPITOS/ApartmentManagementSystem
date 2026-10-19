import React, { useState, useEffect } from 'react';
import {
  DoorClosed,
  Plus,
  Layers,
  Edit2,
  Trash2,
  User,
  Phone,
  Zap,
  Droplets,
  Search,
} from 'lucide-react';
import { useApartment } from '../contexts/ApartmentContext.js';
import api from '../services/api.js';
import type { Room } from '../types/index.js';
import { Modal } from '../components/Modal.js';
import { Input } from '../components/Input.js';
import { roomSchema } from '../utils/validation.js';
import { RoomGridSkeleton } from '../components/Skeleton.js';

export const RoomListPage: React.FC = () => {
  const { selectedApartment, isLoading: isApartmentLoading } = useApartment();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    floor: '1',
    basePrice: '3500',
    customElectricityRate: '',
    customWaterRate: '',
    tenantName: '',
    tenantPhone: '',
    status: 'OCCUPIED' as 'OCCUPIED' | 'VACANT' | 'MAINTENANCE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    floorStart: '1',
    floorEnd: '3',
    roomsPerFloor: '5',
    basePrice: '3500',
  });

  const fetchRooms = async () => {
    if (!selectedApartment) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/rooms/apartment/${selectedApartment.id}`);
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedApartment?.id]);

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setRoomForm({
      roomNumber: '',
      floor: '1',
      basePrice: '3500',
      customElectricityRate: '',
      customWaterRate: '',
      tenantName: '',
      tenantPhone: '',
      status: 'OCCUPIED',
    });
    setFormErrors({});
    setServerError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      roomNumber: room.roomNumber,
      floor: String(room.floor || 1),
      basePrice: String(room.basePrice),
      customElectricityRate: room.customElectricityRate ? String(room.customElectricityRate) : '',
      customWaterRate: room.customWaterRate ? String(room.customWaterRate) : '',
      tenantName: room.tenantName || '',
      tenantPhone: room.tenantPhone || '',
      status: room.status,
    });
    setFormErrors({});
    setServerError(null);
    setIsAddModalOpen(true);
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment) return;
    setServerError(null);

    // Front-end syntax checking
    const payload = {
      apartmentId: selectedApartment.id,
      roomNumber: roomForm.roomNumber.trim(),
      floor: roomForm.floor ? Number(roomForm.floor) : undefined,
      basePrice: Number(roomForm.basePrice),
      customElectricityRate: roomForm.customElectricityRate ? Number(roomForm.customElectricityRate) : undefined,
      customWaterRate: roomForm.customWaterRate ? Number(roomForm.customWaterRate) : undefined,
      tenantName: roomForm.tenantName.trim() || undefined,
      tenantPhone: roomForm.tenantPhone.trim() || undefined,
      status: roomForm.status,
    };

    const validation = roomSchema.safeParse(payload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, payload);
      } else {
        await api.post('/rooms', payload);
      }
      await fetchRooms();
      setIsAddModalOpen(false);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกห้องพัก');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้อง "${roomNumber}"? ข้อมูลมิเตอร์ของห้องนี้จะถูกลบด้วย`)) {
      return;
    }

    try {
      await api.delete(`/rooms/${roomId}`);
      await fetchRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบห้อง');
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment) return;

    const fStart = parseInt(batchForm.floorStart);
    const fEnd = parseInt(batchForm.floorEnd);
    const count = parseInt(batchForm.roomsPerFloor);
    const price = parseFloat(batchForm.basePrice);

    if (isNaN(fStart) || isNaN(fEnd) || isNaN(count) || isNaN(price)) {
      alert('กรุณากรอกตัวเลขให้ถูกต้อง');
      return;
    }

    const roomsToCreate = [];
    for (let f = fStart; f <= fEnd; f++) {
      for (let r = 1; r <= count; r++) {
        const roomNumber = `${f}${String(r).padStart(2, '0')}`;
        roomsToCreate.push({
          roomNumber,
          floor: f,
          basePrice: price,
        });
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/rooms/batch', {
        apartmentId: selectedApartment.id,
        rooms: roomsToCreate,
      });
      await fetchRooms();
      setIsBatchModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างห้องพักเป็นชุด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tenantName && r.tenantName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isApartmentLoading && !selectedApartment) {
    return <RoomGridSkeleton />;
  }

  if (!selectedApartment) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-slate-600">กรุณาเลือกหอพักเพื่อจัดการห้อง</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              จัดการห้องพัก
            </h2>
            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-base font-bold">
              {rooms.length} ห้อง
            </span>
          </div>
          <p className="text-base text-slate-600 mt-1">
            หอพัก: <strong>{selectedApartment.name}</strong>
            {selectedApartment.nickname ? ` (${selectedApartment.nickname})` : ''} — กำหนดราคาค่าเช่าแต่ละห้องได้อิสระ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base transition-colors"
          >
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>สร้างห้องเป็นชุด</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>เพิ่มห้องพักใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขห้อง หรือชื่อผู้เช่า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-base font-semibold text-slate-600">สถานะ:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">ทุกสถานะ ({rooms.length})</option>
            <option value="OCCUPIED">มีผู้เช่า ({rooms.filter((r) => r.status === 'OCCUPIED').length})</option>
            <option value="VACANT">ห้องว่าง ({rooms.filter((r) => r.status === 'VACANT').length})</option>
            <option value="MAINTENANCE">ซ่อมบำรุง ({rooms.filter((r) => r.status === 'MAINTENANCE').length})</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <RoomGridSkeleton />
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredRooms.map((room) => {
            const isOccupied = room.status === 'OCCUPIED';
            const isVacant = room.status === 'VACANT';

            return (
              <div
                key={room.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold text-xl flex items-center justify-center">
                        {room.roomNumber}
                      </div>
                      <div>
                        <h4 className="text-xl sm:text-2xl font-bold text-slate-900">
                          ห้อง {room.roomNumber}
                        </h4>
                        <span className="text-sm font-medium text-slate-500">
                          ชั้น {room.floor || 1}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        isOccupied
                          ? 'bg-emerald-100 text-emerald-800'
                          : isVacant
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isOccupied ? 'มีผู้เช่า' : isVacant ? 'ห้องว่าง' : 'ซ่อมบำรุง'}
                    </span>
                  </div>

                  {/* Base Rent & Utility Rates */}
                  <div className="my-4 p-3.5 rounded-2xl bg-slate-50 space-y-1.5 text-base">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">ราคาค่าเช่าห้อง:</span>
                      <strong className="text-xl font-black text-indigo-700">
                        ฿{room.basePrice.toLocaleString('th-TH')}
                      </strong>
                    </div>

                    {room.customElectricityRate && (
                      <div className="flex items-center justify-between text-sm text-amber-800">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" /> ค่าไฟเฉพาะห้อง:
                        </span>
                        <strong>{room.customElectricityRate} บ./หน่วย</strong>
                      </div>
                    )}

                    {room.customWaterRate && (
                      <div className="flex items-center justify-between text-sm text-sky-800">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5" /> ค่าน้ำเฉพาะห้อง:
                        </span>
                        <strong>{room.customWaterRate} บ./หน่วย</strong>
                      </div>
                    )}
                  </div>

                  {/* Tenant Info */}
                  <div className="space-y-1 text-base text-slate-700 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{room.tenantName ? room.tenantName : <em className="text-slate-400">ยังไม่มีผู้เช่า</em>}</span>
                    </div>
                    {room.tenantPhone && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{room.tenantPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(room)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-base font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="ลบห้องพัก"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <DoorClosed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-xl text-slate-600">ไม่พบห้องพักที่ค้นหา</p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            <span>เพิ่มห้องพักแรก</span>
          </button>
        </div>
      )}

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingRoom ? `แก้ไขห้อง ${editingRoom.roomNumber}` : 'เพิ่มห้องพักใหม่'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          {serverError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-base">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="หมายเลขห้อง"
              placeholder="เช่น 101, A203"
              value={roomForm.roomNumber}
              onChange={(e) => setRoomForm((p) => ({ ...p, roomNumber: e.target.value }))}
              error={formErrors.roomNumber}
              required
            />

            <Input
              label="ชั้น"
              type="number"
              min="1"
              placeholder="1"
              value={roomForm.floor}
              onChange={(e) => setRoomForm((p) => ({ ...p, floor: e.target.value }))}
              error={formErrors.floor}
            />
          </div>

          <Input
            label="ราคาค่าเช่าห้องพักต่อเดือน (Base Price)"
            type="number"
            min="0"
            placeholder="3500"
            value={roomForm.basePrice}
            onChange={(e) => setRoomForm((p) => ({ ...p, basePrice: e.target.value }))}
            error={formErrors.basePrice}
            unitSuffix="บาท/เดือน"
            helperText="แต่ละห้องสามารถกำหนดราคาต่างกันได้"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ชื่อผู้เช่า (ถ้ามี)"
              placeholder="เช่น น.ส. สุดาพร ขยันดี"
              value={roomForm.tenantName}
              onChange={(e) => setRoomForm((p) => ({ ...p, tenantName: e.target.value }))}
              error={formErrors.tenantName}
            />

            <Input
              label="เบอร์โทรผู้เช่า"
              placeholder="0812345678"
              value={roomForm.tenantPhone}
              onChange={(e) => setRoomForm((p) => ({ ...p, tenantPhone: e.target.value }))}
              error={formErrors.tenantPhone}
            />
          </div>

          <div>
            <label className="block text-base font-medium text-slate-800 mb-1.5">
              สถานะห้องพัก
            </label>
            <select
              value={roomForm.status}
              onChange={(e) => setRoomForm((p) => ({ ...p, status: e.target.value as any }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base sm:text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="OCCUPIED">มีผู้เช่า (OCCUPIED)</option>
              <option value="VACANT">ห้องว่าง (VACANT)</option>
              <option value="MAINTENANCE">ปิดปรับปรุง (MAINTENANCE)</option>
            </select>
          </div>

          {/* Optional overrides */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h5 className="font-bold text-slate-900 text-base">
              ⚙️ กำหนดราคาเฉพาะห้องนี้ (หากไม่ระบุ จะใช้อัตราส่วนกลางของหอพัก)
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="อัตราค่าไฟเฉพาะห้อง"
                type="number"
                step="0.1"
                min="0"
                placeholder={String(selectedApartment.defaultElectricityRate)}
                value={roomForm.customElectricityRate}
                onChange={(e) => setRoomForm((p) => ({ ...p, customElectricityRate: e.target.value }))}
                unitSuffix="บ./หน่วย"
              />
              <Input
                label="อัตราค่าน้ำเฉพาะห้อง"
                type="number"
                step="0.1"
                min="0"
                placeholder={String(selectedApartment.defaultWaterRate)}
                value={roomForm.customWaterRate}
                onChange={(e) => setRoomForm((p) => ({ ...p, customWaterRate: e.target.value }))}
                unitSuffix="บ./หน่วย"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-base"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-base disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกห้องพัก'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Create Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="สร้างห้องพักเป็นชุด (Auto Generate)"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <p className="text-base text-slate-600">
            ระบบจะสร้างเลขห้องให้อัตโนมัติ เช่น ชั้น 1-3 ห้องละ 5 ห้อง จะได้เลขห้อง 101-105, 201-205, 301-305
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="เริ่มจากชั้น"
              type="number"
              min="1"
              value={batchForm.floorStart}
              onChange={(e) => setBatchForm((p) => ({ ...p, floorStart: e.target.value }))}
              required
            />
            <Input
              label="ถึงชั้น"
              type="number"
              min="1"
              value={batchForm.floorEnd}
              onChange={(e) => setBatchForm((p) => ({ ...p, floorEnd: e.target.value }))}
              required
            />
          </div>

          <Input
            label="จำนวนห้องต่อชั้น"
            type="number"
            min="1"
            max="50"
            value={batchForm.roomsPerFloor}
            onChange={(e) => setBatchForm((p) => ({ ...p, roomsPerFloor: e.target.value }))}
            required
          />

          <Input
            label="ราคาค่าเช่าห้องต่อเดือน"
            type="number"
            min="0"
            value={batchForm.basePrice}
            onChange={(e) => setBatchForm((p) => ({ ...p, basePrice: e.target.value }))}
            unitSuffix="บาท/เดือน"
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-base"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-base disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังสร้าง...' : 'สร้างห้องพักทั้งหมด'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
