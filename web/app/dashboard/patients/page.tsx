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
    if (diffMin < 1) return "Şimdi";
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} sa önce`;
    return `${Math.floor(diffH / 24)} gün önce`;
  };

  // ----- Tarih formatlama -----
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Hasta Yönetimi</h1>
          <p className={styles.pageDesc}>
            Tüm hastalarınızı görüntüleyin ve takip edin.
          </p>
        </div>
        <button className={styles.addBtn} onClick={openAddModal}>
          <UserPlus size={16} />
          Hasta Ekle
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
                ? "Tümü"
                : tab === "recording"
                  ? "Aktif"
                  : tab === "idle"
                    ? "Beklemede"
                    : "Çevrimdışı"}
              <span className={styles.tabCount}>{counts[tab]}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Hasta ara..."
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
          <p>Hastalar yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hasta</th>
                  <th>Tanı</th>
                  <th>Durum</th>
                  <th>BPM</th>
                  <th>Sinyal</th>
                  <th>Son Sync</th>
                  <th>Uyarılar (24s)</th>
                  <th>İşlemler</th>
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
                            {patient.age} yaş ·{" "}
                            {patient.gender === "M" ? "Erkek" : "Kadın"}
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
                            <Wifi size={10} /> Canlı Kayıt
                          </>
                        ) : patient.deviceStatus === "connected" ? (
                          <>
                            <Activity size={10} /> Bağlı
                          </>
                        ) : patient.status === "recording" ? (
                          <>
                            <Wifi size={10} /> Kayıt
                          </>
                        ) : patient.status === "idle" ? (
                          <>
                            <Activity size={10} /> Beklemede
                          </>
                        ) : (
                          <>
                            <WifiOff size={10} /> Çevrimdışı
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
                            <span className={styles.liveDot} title="Canlı veri" />
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
                          title="Detay"
                          onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title="Düzenle"
                          onClick={() => openEditModal(patient)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          title="Sil"
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
                    ? "Henüz hasta eklenmemiş. İlk hastanızı ekleyin."
                    : "Aramanızla eşleşen hasta bulunamadı."}
                </p>
                {patients.length === 0 && (
                  <button className={styles.addBtnSmall} onClick={openAddModal}>
                    <UserPlus size={14} />
                    Hasta Ekle
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
                {selectedUser ? "Hasta Bilgilerini Tamamla" : "Kayıtlı Hasta Ara"}
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
                    Sistemde hasta olarak kayıtlı kişileri isim veya e-posta ile
                    arayarak listenize ekleyebilirsiniz.
                  </p>

                  <div className={styles.userSearchBox}>
                    <div className={styles.userSearchInputWrap}>
                      <Search size={16} className={styles.userSearchIcon} />
                      <input
                        type="text"
                        className={styles.userSearchInput}
                        placeholder="İsim veya e-posta ile arayın..."
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
                        "Ara"
                      )}
                    </button>
                  </div>

                  {/* Arama Sonuçları */}
                  {searching && (
                    <div className={styles.searchLoading}>
                      <Loader2 size={18} className={styles.spin} />
                      <span>Aranıyor...</span>
                    </div>
                  )}

                  {!searching && searchDone && searchResults.length === 0 && (
                    <div className={styles.searchEmpty}>
                      <User size={20} />
                      <p>
                        &ldquo;{userSearch}&rdquo; ile eşleşen kayıtlı hasta
                        bulunamadı.
                      </p>
                      <span className={styles.searchEmptyHint}>
                        Hastanın mobil uygulamadan kayıt olması gerekiyor.
                      </span>
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className={styles.searchResults}>
                      <div className={styles.resultCount}>
                        {searchResults.length} sonuç bulundu
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
                              {u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "İsimsiz"}
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
                                    ? "Erkek"
                                    : u.gender === "female"
                                      ? "Kadın"
                                      : "Diğer"}
                                </span>
                              )}
                            </div>
                            {u.onboardingComplete && (
                              <span className={styles.resultBadge}>
                                <UserCheck size={11} /> Onboarding Tamamlandı
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
                          ` · ${selectedUser.gender === "male" ? "Erkek" : selectedUser.gender === "female" ? "Kadın" : "Diğer"}`}
                      </div>
                    </div>
                    <button
                      className={styles.changeUserBtn}
                      onClick={() => setSelectedUser(null)}
                    >
                      Değiştir
                    </button>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tanı</label>
                      <input
                        className={styles.formInput}
                        value={addDiagnosis}
                        onChange={(e) => setAddDiagnosis(e.target.value)}
                        placeholder="Örn: Atriyal Fibrilasyon"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Notlar</label>
                      <textarea
                        className={styles.formTextarea}
                        value={addNotes}
                        onChange={(e) => setAddNotes(e.target.value)}
                        placeholder="Doktor notları..."
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
                  İptal
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleAddPatient}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className={styles.spin} />{" "}
                      Ekleniyor...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Hastayı Ekle
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
              <h2 className={styles.modalTitle}>Hasta Düzenle</h2>
              <button className={styles.modalClose} onClick={closeEditModal}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ad Soyad *</label>
                  <input
                    className={styles.formInput}
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Hasta adı soyadı"
                  />
                </div>
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Yaş *</label>
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
                    <label className={styles.formLabel}>Cinsiyet</label>
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
                      <option value="M">Erkek</option>
                      <option value="F">Kadın</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tanı</label>
                  <input
                    className={styles.formInput}
                    value={editForm.diagnosis}
                    onChange={(e) =>
                      setEditForm({ ...editForm, diagnosis: e.target.value })
                    }
                    placeholder="Örn: Atriyal Fibrilasyon"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Durum</label>
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
                    <option value="idle">Beklemede</option>
                    <option value="recording">Kayıt (Aktif)</option>
                    <option value="offline">Çevrimdışı</option>
                  </select>
                </div>
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>E-posta</label>
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
                    <label className={styles.formLabel}>Telefon</label>
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
                  <label className={styles.formLabel}>Notlar</label>
                  <textarea
                    className={styles.formTextarea}
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    placeholder="Doktor notları..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeEditModal}>
                İptal
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleEditSave}
                disabled={editSaving || !editForm.name.trim()}
              >
                {editSaving ? (
                  <>
                    <Loader2 size={14} className={styles.spin} />{" "}
                    Kaydediliyor...
                  </>
                ) : (
                  "Güncelle"
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
            <h3 className={styles.confirmTitle}>Hastayı Sil</h3>
            <p className={styles.confirmDesc}>
              Bu hastayı ve tüm ilişkili uyarıları kalıcı olarak silmek
              istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                İptal
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className={styles.spin} /> Siliniyor...
                  </>
                ) : (
                  "Evet, Sil"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
