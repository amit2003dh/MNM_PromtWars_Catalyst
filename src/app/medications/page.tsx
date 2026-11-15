'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MedicationCard from '@/components/MedicationCard';
import { useCare } from '@/context/CareContext';
import { Medication, MedicineCategory, MealRelation } from '@/types';
import {
  Pill,
  Plus,
  Search,
  AlertTriangle,
  Filter,
  X,
  Package,
} from 'lucide-react';

export default function MedicationsPage() {
  const { medications, addMedication, deleteMedication, user } = useCare();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    medicineName: '',
    medicineCategory: 'allopathic' as MedicineCategory,
    dosage: '',
    instructions: '',
    frequency: 'daily',
    scheduledTimes: '08:00',
    mealRelation: 'after_meal' as MealRelation,
    pillColor: 'White',
    pillShape: 'Round',
    totalQuantity: 30,
    remainingQuantity: 30,
    refillThreshold: 7,
    startDate: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  const lowStockCount = medications.filter((m) => m.remainingQuantity <= m.refillThreshold).length;

  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.medicineName.toLowerCase().includes(search.toLowerCase()) ||
      m.instructions.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || m.medicineCategory === selectedCategory;
    const matchesLowStock = !showLowStockOnly || m.remainingQuantity <= m.refillThreshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName || submitting) return;

    setSubmitting(true);
    try {
      const times = formData.scheduledTimes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await addMedication({
        medicineName: formData.medicineName,
        medicineCategory: formData.medicineCategory,
        dosage: formData.dosage || '1 tablet',
        instructions: formData.instructions,
        frequency: formData.frequency,
        scheduledTimes: times.length > 0 ? times : ['08:00'],
        mealRelation: formData.mealRelation,
        pillColor: formData.pillColor,
        pillShape: formData.pillShape,
        totalQuantity: Number(formData.totalQuantity),
        remainingQuantity: Number(formData.remainingQuantity),
        refillThreshold: Number(formData.refillThreshold),
        startDate: formData.startDate,
        status: 'active',
        reconciliationStatus: 'CONTINUE',
      });

      setAddModalOpen(false);
      setFormData({
        medicineName: '',
        medicineCategory: 'allopathic',
        dosage: '',
        instructions: '',
        frequency: 'daily',
        scheduledTimes: '08:00',
        mealRelation: 'after_meal',
        pillColor: 'White',
        pillShape: 'Round',
        totalQuantity: 30,
        remainingQuantity: 30,
        refillThreshold: 7,
        startDate: new Date().toISOString().split('T')[0],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                Medication Cabinet
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                {medications.length} Prescribed Medications
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Active Prescriptions & Stock
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Medication</span>
          </button>
        </div>

        {/* Low Stock Refill Alert Banner */}
        {lowStockCount > 0 && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                <strong>Refill Warning:</strong> {lowStockCount} medication{lowStockCount > 1 ? 's' : ''} have fallen below their safety refill threshold!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shrink-0"
            >
              {showLowStockOnly ? 'Show All' : 'Filter Low Stock'}
            </button>
          </div>
        )}

        {/* Filters & Search Row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medication name or instructions..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-nest-500 font-medium"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'allopathic', 'ayurvedic', 'herbal', 'otc'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-navy-950 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Medication Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMeds.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-400">
              <Pill className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-base text-slate-600">No medications match your filter</p>
              <p className="text-xs mt-1">Try resetting search or category filters</p>
            </div>
          ) : (
            filteredMeds.map((med) => (
              <MedicationCard
                key={med._id}
                medication={med}
                onDelete={(id) => deleteMedication(id)}
              />
            ))
          )}
        </div>

        {/* Add Medication Modal */}
        {addModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs overflow-y-auto"
          >
            <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 my-8">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-black text-navy-950 mb-1">Add Prescribed Medication</h3>
              <p className="text-xs text-slate-500 mb-5">
                Register new medicine into Meera Sharma&apos;s cabinet with dose timing and inventory threshold
              </p>

              <form onSubmit={handleCreateMedication} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Medicine Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.medicineName}
                      onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                      placeholder="e.g. Telmisartan"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                    <select
                      value={formData.medicineCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, medicineCategory: e.target.value as MedicineCategory })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none bg-white"
                    >
                      <option value="allopathic">Allopathic</option>
                      <option value="ayurvedic">Ayurvedic</option>
                      <option value="herbal">Herbal</option>
                      <option value="otc">Over-The-Counter (OTC)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dosage *</label>
                    <input
                      type="text"
                      required
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      placeholder="e.g. 40 mg or 1 capsule"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Scheduled Times (comma-separated HH:mm) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.scheduledTimes}
                      onChange={(e) => setFormData({ ...formData, scheduledTimes: e.target.value })}
                      placeholder="e.g. 08:00, 20:00"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Meal Relation</label>
                    <select
                      value={formData.mealRelation}
                      onChange={(e) =>
                        setFormData({ ...formData, mealRelation: e.target.value as MealRelation })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none bg-white"
                    >
                      <option value="after_meal">After Meal</option>
                      <option value="before_meal">Before Meal</option>
                      <option value="with_meal">With Meal</option>
                      <option value="empty_stomach">Empty Stomach</option>
                      <option value="anytime">Anytime</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pill Color</label>
                    <select
                      value={formData.pillColor}
                      onChange={(e) => setFormData({ ...formData, pillColor: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none bg-white"
                    >
                      <option value="White">White</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Brown">Brown</option>
                      <option value="Peach">Peach</option>
                      <option value="Blue">Blue</option>
                      <option value="Red">Red</option>
                      <option value="Green">Green</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pill Shape</label>
                    <select
                      value={formData.pillShape}
                      onChange={(e) => setFormData({ ...formData, pillShape: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none bg-white"
                    >
                      <option value="Round">Round</option>
                      <option value="Oval">Oval</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Chewable">Chewable</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Stock</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalQuantity}
                      onChange={(e) => setFormData({ ...formData, totalQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Remaining Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.remainingQuantity}
                      onChange={(e) => setFormData({ ...formData, remainingQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Refill Threshold</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.refillThreshold}
                      onChange={(e) => setFormData({ ...formData, refillThreshold: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instructions *</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="e.g. Take 1 tablet after breakfast with plenty of water. Do not crush."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-nest-600 hover:bg-nest-700 text-white text-xs font-bold shadow-xs"
                  >
                    {submitting ? 'Adding...' : 'Add to Cabinet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
