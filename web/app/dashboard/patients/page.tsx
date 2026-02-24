"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Heart,
  Wifi,
  WifiOff,
  Activity,
  User,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Mail,
  Calendar,
  UserCheck,
  Eye,
} from "lucide-react";
import { usePatients } from "@/lib/firebase/realtime";
import { useAuth } from "@/lib/firebase/hooks";
import {
  addPatientFromUser,
  updatePatient,
  deletePatient,
  searchRegisteredUsers,
} from "@/lib/firebase/firestore";
import type { PatientDoc, RegisteredUserDoc } from "@/lib/firebase/types";
import styles from "./page.module.css";

// Detay sayfasına yönlendirme için router

// ---------------------------------------------------------------------------
// Düzenleme formu (mevcut hasta düzenleme için)
// ---------------------------------------------------------------------------
const emptyEditForm = {
  name: "",
  age: "",
  gender: "M" as "M" | "F",
  diagnosis: "",
  status: "idle" as PatientDoc["status"],
  bpm: "",
  signal: "",
  email: "",
  phone: "",
  notes: "",
};

type EditFormData = typeof emptyEditForm;

export default function PatientsPage() {
  const { user } = useAuth();
  const { patients, loading } = usePatients();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ===== Hasta Ekleme (Arama) Modal =====
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<RegisteredUserDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RegisteredUserDoc | null>(
    null
  );
  const [addDiagnosis, setAddDiagnosis] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ===== Düzenleme Modal =====
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);

  // ===== Silme =====
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ----- Filtreleme -----
  const filtered = patients.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(s) ||
      (p.id ?? "").toLowerCase().includes(s) ||
      p.diagnosis.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: patients.length,
    recording: patients.filter(
      (p) => p.status === "recording" || p.deviceStatus === "recording"
    ).length,
    idle: patients.filter(
      (p) =>
        (p.status === "idle" || p.deviceStatus === "connected") &&
        p.deviceStatus !== "recording"
    ).length,
    offline: patients.filter(
      (p) =>
        p.status === "offline" ||
        (!p.deviceStatus || p.deviceStatus === "disconnected")
    ).length,
  };

  // ----- Kayıtlı kullanıcı arama -----
  const handleUserSearch = useCallback(async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    setSearchDone(false);
    try {
      // Zaten eklenmiş hastaların userId'lerini çıkar
      const existingUserIds = patients
        .map((p) => p.userId)
        .filter(Boolean) as string[];
      const results = await searchRegisteredUsers(
        userSearch.trim(),
        existingUserIds
      );
      setSearchResults(results);
    } catch (err) {
      console.error("[Patients] Search error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [userSearch, patients]);

  // ----- Hasta ekleme modal -----
  const openAddModal = () => {
    setUserSearch("");
    setSearchResults([]);
    setSearchDone(false);
    setSelectedUser(null);
    setAddDiagnosis("");
    setAddNotes("");
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setSelectedUser(null);
  };

  const handleAddPatient = async () => {
    if (!user || !selectedUser) return;
    setSaving(true);
    try {
      await addPatientFromUser(user.uid, selectedUser, {
        diagnosis: addDiagnosis,
        notes: addNotes,
        doctorName: user.displayName || "",
      });
      closeAddModal();
    } catch (err) {
      console.error("[Patients] Add error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ----- Düzenleme modal -----
  const openEditModal = (patient: PatientDoc) => {
    setEditingId(patient.id ?? null);
    setEditForm({
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      diagnosis: patient.diagnosis,
      status: patient.status,
      bpm: patient.bpm !== null ? String(patient.bpm) : "",
      signal: String(patient.signal),
      email: patient.email || "",
      phone: patient.phone || "",
      notes: patient.notes || "",
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingId(null);
    setEditForm(emptyEditForm);
  };

  const handleEditSave = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setEditSaving(true);
    try {
      const data = {
        name: editForm.name.trim(),
        age: parseInt(editForm.age) || 0,
        gender: editForm.gender,
        diagnosis: editForm.diagnosis.trim(),
        status: editForm.status,
        bpm: editForm.bpm ? parseInt(editForm.bpm) : null,
        signal: parseInt(editForm.signal) || 0,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      };
      await updatePatient(editingId, data);
      closeEditModal();
    } catch (err) {
      console.error("[Patients] Edit error:", err);
    } finally {
      setEditSaving(false);
    }
  };

  // ----- Sil -----
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deletePatient(id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error("[Patients] Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ----- Zaman formatlama -----
  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  };

  // ----- Tarih formatlama -----
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Patient Management</h1>
          <p className={styles.pageDesc}>
            View and monitor all your patients.
          </p>
        </div>
        <button className={styles.addBtn} onClick={openAddModal}>
          <UserPlus size={16} />
          Add Patient
        </button>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterBar}>
        <div className={styles.tabs}>
          {(["all", "recording", "idle", "offline"] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${statusFilter === tab ? styles.tabActive : ""}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab === "all"
                ? "All"
                : tab === "recording"
                  ? "Active"
                  : tab === "idle"
                    ? "Idle"
                    : "Offline"}
              <span className={styles.tabCount}>{counts[tab]}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spin} />
          <p>Loading patients...</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Diagnosis</th>
                  <th>Status</th>
                  <th>BPM</th>
                  <th>Signal</th>
                  <th>Last Sync</th>
                  <th>Alerts (24h)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.id} className={styles.row}>
                    <td>
                      <div className={styles.patientCell}>
                        <div className={styles.avatar}>
                          <User size={14} />
                        </div>
                        <div>
                          <div
                            className={styles.patientName}
                            style={{ cursor: "pointer" }}
                            onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                          >
                            {patient.name}
                          </div>
                          <div className={styles.patientMeta}>
                            {patient.age} y/o ·{" "}
                            {patient.gender === "M" ? "Male" : "Female"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.diagnosis}>
                        {patient.diagnosis || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[`status_${patient.deviceStatus === "recording" ? "recording" : patient.deviceStatus === "connected" ? "idle" : patient.status}`]}`}
                      >
                        {patient.deviceStatus === "recording" ? (
                          <>  
                            <Wifi size={10} /> Live Recording
                          </>
                        ) : patient.deviceStatus === "connected" ? (
                          <>
                            <Activity size={10} /> Connected
                          </>
                        ) : patient.status === "recording" ? (
                          <>
                            <Wifi size={10} /> Recording
                          </>
                        ) : patient.status === "idle" ? (
                          <>
                            <Activity size={10} /> Idle
                          </>
                        ) : (
                          <>
                            <WifiOff size={10} /> Offline
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      {(patient.lastBPM ?? patient.bpm) ? (
                        <span className={styles.bpmCell}>
                          <Heart size={12} color={patient.lastBPM ? "#ef4444" : undefined} />
                          {" "}{patient.lastBPM ?? patient.bpm}
                          {patient.lastBPM && (
                            <span className={styles.liveDot} title="Live data" />
                          )}
                        </span>
                      ) : (
                        <span className={styles.dimText}>—</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.signalCell}>
                        <div className={styles.signalBar}>
                          <div
                            className={styles.signalFill}
                            style={{
                              width: `${patient.lastSignalQuality != null ? Math.round(patient.lastSignalQuality * 100) : patient.signal}%`,
                            }}
                          />
                        </div>
                        <span className={styles.signalPercent}>
                          {patient.lastSignalQuality != null
                            ? `${Math.round(patient.lastSignalQuality * 100)}%`
                            : patient.signal > 0
                              ? `${patient.signal}%`
                              : "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.syncTime}>
                        {formatTime(patient.lastSync)}
                      </span>
                    </td>
                    <td>
                      {patient.alerts24h > 0 ? (
                        <span className={styles.alertCount}>
                          {patient.alerts24h}
                        </span>
                      ) : (
                        <span className={styles.dimText}>0</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.actionBtn} ${styles.actionPrimary}`}
                          title="Details"
                          onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title="Edit"
                          onClick={() => openEditModal(patient)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          title="Delete"
                          onClick={() => setDeleteConfirm(patient.id ?? null)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className={styles.emptyState}>
                <Filter size={24} />
                <p>
                  {patients.length === 0
                    ? "No patients added yet. Add your first patient."
                    : "No patients matching your search."}
                </p>
                {patients.length === 0 && (
                  <button className={styles.addBtnSmall} onClick={openAddModal}>
                    <UserPlus size={14} />
                    Add Patient
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== Hasta Ekleme Modal — Kayıtlı Kullanıcı Arama ===== */}
      {addModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {selectedUser ? "Complete Patient Information" : "Search Registered Patients"}
              </h2>
              <button className={styles.modalClose} onClick={closeAddModal}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Seçili kullanıcı yokken — Arama arayüzü */}
              {!selectedUser ? (
                <>
                  <p className={styles.searchHint}>
                    Search for registered patients by name or email to add them
                    to your list.
                  </p>

                  <div className={styles.userSearchBox}>
                    <div className={styles.userSearchInputWrap}>
                      <Search size={16} className={styles.userSearchIcon} />
                      <input
                        type="text"
                        className={styles.userSearchInput}
                        placeholder="Search by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                        autoFocus
                      />
                    </div>
                    <button
                      className={styles.searchBtn}
                      onClick={handleUserSearch}
                      disabled={searching || !userSearch.trim()}
                    >
                      {searching ? (
                        <Loader2 size={16} className={styles.spin} />
                      ) : (
                        "Search"
                      )}
                    </button>
                  </div>

                  {/* Arama Sonuçları */}
                  {searching && (
                    <div className={styles.searchLoading}>
                      <Loader2 size={18} className={styles.spin} />
                      <span>Searching...</span>
                    </div>
                  )}

                  {!searching && searchDone && searchResults.length === 0 && (
                    <div className={styles.searchEmpty}>
                      <User size={20} />
                      <p>
                        &ldquo;{userSearch}&rdquo; — no registered patients
                        found.
                      </p>
                      <span className={styles.searchEmptyHint}>
                        The patient needs to register via the mobile app.
                      </span>
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className={styles.searchResults}>
                      <div className={styles.resultCount}>
                        {searchResults.length} results found
                      </div>
                      {searchResults.map((u) => (
                        <button
                          key={u.uid}
                          className={styles.resultCard}
                          onClick={() => setSelectedUser(u)}
                        >
                          <div className={styles.resultAvatar}>
                            <User size={16} />
                          </div>
                          <div className={styles.resultInfo}>
                            <div className={styles.resultName}>
                              {u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unnamed"}
                            </div>
                            <div className={styles.resultMeta}>
                              <span>
                                <Mail size={11} /> {u.email}
                              </span>
                              {u.dateOfBirth && (
                                <span>
                                  <Calendar size={11} />{" "}
                                  {formatDate(u.dateOfBirth)}
                                </span>
                              )}
                              {u.gender && (
                                <span>
                                  {u.gender === "male"
                                    ? "Male"
                                    : u.gender === "female"
                                      ? "Female"
                                      : "Other"}
                                </span>
                              )}
                            </div>
                            {u.onboardingComplete && (
                              <span className={styles.resultBadge}>
                                <UserCheck size={11} /> Onboarding Complete
                              </span>
                            )}
                          </div>
                          <div className={styles.resultAction}>
                            <UserPlus size={16} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Kullanıcı seçildikten sonra — Ek bilgi formu */
                <>
                  <div className={styles.selectedUserCard}>
                    <div className={styles.selectedAvatar}>
                      <UserCheck size={18} />
                    </div>
                    <div className={styles.selectedInfo}>
                      <div className={styles.selectedName}>
                        {selectedUser.displayName}
                      </div>
                      <div className={styles.selectedMeta}>
                        {selectedUser.email}
                        {selectedUser.dateOfBirth &&
                          ` · ${formatDate(selectedUser.dateOfBirth)}`}
                        {selectedUser.gender &&
                          ` · ${selectedUser.gender === "male" ? "Male" : selectedUser.gender === "female" ? "Female" : "Other"}`}
                      </div>
                    </div>
                    <button
                      className={styles.changeUserBtn}
                      onClick={() => setSelectedUser(null)}
                    >
                      Change
                    </button>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Diagnosis</label>
                      <input
                        className={styles.formInput}
                        value={addDiagnosis}
                        onChange={(e) => setAddDiagnosis(e.target.value)}
                        placeholder="e.g. Atrial Fibrillation"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Notes</label>
                      <textarea
                        className={styles.formTextarea}
                        value={addNotes}
                        onChange={(e) => setAddNotes(e.target.value)}
                        placeholder="Doctor notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {selectedUser && (
              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={closeAddModal}>
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleAddPatient}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className={styles.spin} />{" "}
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Add Patient
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Hasta Düzenleme Modal ===== */}
      {editModalOpen && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Patient</h2>
              <button className={styles.modalClose} onClick={closeEditModal}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name *</label>
                  <input
                    className={styles.formInput}
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Patient full name"
                  />
                </div>
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Age *</label>
                    <input
                      className={styles.formInput}
                      type="number"
                      value={editForm.age}
                      onChange={(e) =>
                        setEditForm({ ...editForm, age: e.target.value })
                      }
                      placeholder="65"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Gender</label>
                    <select
                      className={styles.formSelect}
                      value={editForm.gender}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          gender: e.target.value as "M" | "F",
                        })
                      }
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Diagnosis</label>
                  <input
                    className={styles.formInput}
                    value={editForm.diagnosis}
                    onChange={(e) =>
                      setEditForm({ ...editForm, diagnosis: e.target.value })
                    }
                    placeholder="e.g. Atrial Fibrillation"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Status</label>
                  <select
                    className={styles.formSelect}
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as PatientDoc["status"],
                      })
                    }
                  >
                    <option value="idle">Idle</option>
                    <option value="recording">Recording (Active)</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <input
                      className={styles.formInput}
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      placeholder="hasta@email.com"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone</label>
                    <input
                      className={styles.formInput}
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="+90 5XX XXX XX XX"
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Notes</label>
                  <textarea
                    className={styles.formTextarea}
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    placeholder="Doctor notes..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeEditModal}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleEditSave}
                disabled={editSaving || !editForm.name.trim()}
              >
                {editSaving ? (
                  <>
                    <Loader2 size={14} className={styles.spin} />{" "}
                    Saving...
                  </>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Silme Onay Dialog ===== */}
      {deleteConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className={styles.confirmModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmIcon}>
              <Trash2 size={24} />
            </div>
            <h3 className={styles.confirmTitle}>Delete Patient</h3>
            <p className={styles.confirmDesc}>
              Are you sure you want to permanently delete this patient and all
              associated alerts? This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className={styles.spin} /> Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
