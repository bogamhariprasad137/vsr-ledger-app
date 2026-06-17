import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Search, UserPlus, Filter, Trash2, Eye, CalendarDays, Settings, ShieldAlert, X, CheckCircle } from "lucide-react";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add/Edit Student Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_name: "",
    parent_name: "",
    parent_email: "",
    parent_phone: "",
    class: "Grade 5-A",
    admission_number: "",
    admission_date: new Date().toISOString().split("T")[0],
    admission_fee: 0,
    term_fee: 0,
    daycare_fee: 0,
    total_fee: 0,
    initial_payment: 0,
    remaining_balance: 0,
    due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    payment_schedule: "Monthly",
    notes: "",
    status: "active"
  });

  const loadStudents = async () => {
    try {
      const data = await api.students.getAll();
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleSearchChange = (e) => setSearchQuery(e.target.value);
  const handleClassChange = (e) => setClassFilter(e.target.value);
  const handleStatusChange = (e) => setStatusFilter(e.target.value);

  // Filter students based on UI selections
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = classFilter === "" || s.class === classFilter;
    const matchesStatus = statusFilter === "" || s.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Extract classes for filter options
  const uniqueClasses = Array.from(new Set(students.map(s => s.class)));

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingStudentId(null);
    setFormData({
      student_name: "",
      parent_name: "",
      parent_email: "",
      parent_phone: "",
      class: "Grade 5-A",
      admission_number: "",
      admission_date: new Date().toISOString().split("T")[0],
      admission_fee: 0,
      term_fee: 0,
      daycare_fee: 0,
      total_fee: 0,
      initial_payment: 0,
      remaining_balance: 0,
      due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      payment_schedule: "Monthly",
      notes: "",
      status: "active"
    });
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(false);
    setShowAddModal(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") {
      handleOpenAdd();
      // Clean query parameter from address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [students]);

  const handleOpenEdit = (student) => {
    setIsEditing(true);
    setEditingStudentId(student.student_id);
    setFormData({
      student_name: student.student_name,
      parent_name: student.parent_name,
      parent_email: student.parent_email,
      parent_phone: student.parent_phone || "",
      class: student.class,
      admission_number: student.admission_number,
      admission_date: student.admission_date || new Date().toISOString().split("T")[0],
      admission_fee: student.admission_fee || 0,
      term_fee: student.term_fee || 0,
      daycare_fee: student.daycare_fee || 0,
      total_fee: student.total_fee || 0,
      initial_payment: student.paid_amount || 0,
      remaining_balance: student.pending_amount || 0,
      due_date: student.due_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      payment_schedule: student.payment_schedule || "Monthly",
      notes: student.notes || "",
      status: student.status
    });
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(false);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!window.confirm("Are you sure you want to permanently delete this student record?")) {
      return;
    }

    try {
      await api.students.delete(id);
      setSuccessMsg("Student deleted successfully.");
      loadStudents();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleFeeSplitChange = (field, val) => {
    const value = parseFloat(val) || 0;
    const nextFormData = { ...formData, [field]: value };
    const total = (nextFormData.admission_fee || 0) + (nextFormData.term_fee || 0) + (nextFormData.daycare_fee || 0);
    const initial = parseFloat(nextFormData.initial_payment) || 0;
    const remaining = total - initial;

    setFormData({
      ...nextFormData,
      total_fee: total,
      remaining_balance: remaining
    });
  };

  const handleInitialPaymentChange = (val) => {
    const initial = parseFloat(val) || 0;
    const remaining = formData.total_fee - initial;
    setFormData({
      ...formData,
      initial_payment: initial,
      remaining_balance: remaining
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isEditing) {
        await api.students.update(editingStudentId, formData);
        setSuccessMsg("Student profile updated successfully.");
      } else {
        await api.students.create(formData);
        setSuccessMsg("New student registered successfully. Installments initialized.");
      }
      setTimeout(() => {
        setShowAddModal(false);
        loadStudents();
        setIsSubmitting(false);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="content-pane">
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Intellitots Student Fee Ledger</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <UserPlus size={18} />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div
          className="badge badge-overdue"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            width: "100%",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            textTransform: "none",
            fontSize: "13px",
            lineHeight: "1.4"
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div
          className="badge badge-paid"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            textTransform: "none",
            fontSize: "13px"
          }}
        >
          <CheckCircle size={16} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Filter panel */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: "1rem"
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              color="var(--warm-muted)"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search by student name, admission number, parent email..."
              style={{ paddingLeft: "38px" }}
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={16} color="var(--warm-muted)" />
            <select className="form-control" value={classFilter} onChange={handleClassChange}>
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={16} color="var(--warm-muted)" />
            <select className="form-control" value={statusFilter} onChange={handleStatusChange}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Total Fee</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(s => {
                  const isInactive = s.status === "inactive";
                  return (
                    <tr key={s.student_id} className={isInactive ? "table-row-inactive" : ""}>
                      <td style={{ fontWeight: "600" }}>{s.student_name}</td>
                      <td className="mono-data">{s.admission_number}</td>
                      <td>{s.class}</td>
                      <td className="mono-data">₹{s.total_fee.toLocaleString("en-IN")}</td>
                      <td className="mono-data" style={{ color: "var(--status-paid-text)", fontWeight: "600" }}>
                        ₹{s.paid_amount.toLocaleString("en-IN")}
                      </td>
                      <td className="mono-data" style={{ color: s.pending_amount > 0 ? "var(--status-pending-text)" : "var(--status-paid-text)", fontWeight: "600" }}>
                        ₹{s.pending_amount.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className={`badge ${s.fee_status === "Paid" ? "badge-paid" : s.fee_status === "Overdue" ? "badge-overdue" : "badge-pending"}`}>
                          {s.fee_status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <Link
                            to={`/admin/students/${s.student_id}`}
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem", height: "auto" }}
                            title="View Student Profile"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link
                            to={`/admin/students/${s.student_id}/installments`}
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem", height: "auto" }}
                            title="Configure Installments"
                          >
                            <CalendarDays size={14} />
                          </Link>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem", height: "auto" }}
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Profile"
                          >
                            <Settings size={14} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "0.35rem", height: "auto" }}
                            onClick={() => handleDelete(s.student_id)}
                            title="Delete Student"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--warm-muted)", padding: "2.5rem" }}>
                    No students matching the filter query found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="dialog-overlay">
          <div className="dialog" style={{ maxWidth: "680px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="dialog-header">
              <h3 style={{ fontSize: "1.25rem" }}>{isEditing ? "Modify Student Details" : "Register New Student"}</h3>
              <button
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--warm-muted)" }}
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                className="badge badge-overdue"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", textTransform: "none" }}
              >
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                className="badge badge-paid"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", textTransform: "none" }}
              >
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="sidebar-section-title" style={{ marginTop: "0", marginBottom: "0.75rem", paddingLeft: 0 }}>
                Student Information
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-name">Student Full Name *</label>
                  <input
                    id="modal-name"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Alice Smith"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-class">Class Room *</label>
                  <select
                    id="modal-class"
                    className="form-control"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  >
                    <option value="Grade 1-A">Grade 1-A</option>
                    <option value="Grade 2-B">Grade 2-B</option>
                    <option value="Grade 3-C">Grade 3-C</option>
                    <option value="Grade 4-D">Grade 4-D</option>
                    <option value="Grade 5-A">Grade 5-A</option>
                    <option value="Grade 6-B">Grade 6-B</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-admission">Admission Number</label>
                  <input
                    id="modal-admission"
                    type="text"
                    className="form-control mono-data"
                    placeholder="Auto-Generated if empty"
                    value={formData.admission_number}
                    onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                    disabled={isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-admission-date">Admission Date *</label>
                  <input
                    id="modal-admission-date"
                    type="date"
                    className="form-control"
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="sidebar-section-title" style={{ marginTop: "1rem", marginBottom: "0.75rem", paddingLeft: 0 }}>
                Fee Information
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-admission-fee">Admission Fee (₹) *</label>
                  <input
                    id="modal-admission-fee"
                    type="number"
                    className="form-control mono-data"
                    placeholder="e.g. 5000"
                    value={formData.admission_fee}
                    onChange={(e) => handleFeeSplitChange("admission_fee", e.target.value)}
                    required
                    disabled={isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-term-fee">Term Fee (₹) *</label>
                  <input
                    id="modal-term-fee"
                    type="number"
                    className="form-control mono-data"
                    placeholder="e.g. 15000"
                    value={formData.term_fee}
                    onChange={(e) => handleFeeSplitChange("term_fee", e.target.value)}
                    required
                    disabled={isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-daycare-fee">Daycare Fee (₹) *</label>
                  <input
                    id="modal-daycare-fee"
                    type="number"
                    className="form-control mono-data"
                    placeholder="e.g. 10000"
                    value={formData.daycare_fee}
                    onChange={(e) => handleFeeSplitChange("daycare_fee", e.target.value)}
                    required
                    disabled={isEditing}
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-total-fee">Total Fee (₹)</label>
                  <input
                    id="modal-total-fee"
                    type="number"
                    className="form-control mono-data"
                    value={formData.total_fee}
                    disabled
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-initial-payment">Initial Payment (₹) *</label>
                  <input
                    id="modal-initial-payment"
                    type="number"
                    className="form-control mono-data"
                    placeholder="e.g. 2000"
                    value={formData.initial_payment}
                    onChange={(e) => handleInitialPaymentChange(e.target.value)}
                    required
                    disabled={isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-remaining-balance">Remaining Balance (₹)</label>
                  <input
                    id="modal-remaining-balance"
                    type="number"
                    className="form-control mono-data"
                    value={formData.remaining_balance}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="sidebar-section-title" style={{ marginTop: "1rem", marginBottom: "0.75rem", paddingLeft: 0 }}>
                Deadline & Schedule Information
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-due-date">Overall Fee Due Date *</label>
                  <input
                    id="modal-due-date"
                    type="date"
                    className="form-control"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-schedule">Payment Schedule</label>
                  <select
                    id="modal-schedule"
                    className="form-control"
                    value={formData.payment_schedule}
                    onChange={(e) => setFormData({ ...formData, payment_schedule: e.target.value })}
                  >
                    <option value="One-Time">One-Time</option>
                    <option value="Monthly">Monthly Installments</option>
                    <option value="Quarterly">Quarterly Installments</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-notes">Additional Notes</label>
                <textarea
                  id="modal-notes"
                  className="form-control"
                  style={{ minHeight: "80px", resize: "vertical" }}
                  placeholder="Additional configurations or comments..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="sidebar-section-title" style={{ marginTop: "1rem", marginBottom: "0.75rem", paddingLeft: 0 }}>
                Guardian Connection
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-parent">Parent / Guardian Name *</label>
                  <input
                    id="modal-parent"
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Smith"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-phone">Contact Phone</label>
                  <input
                    id="modal-phone"
                    type="text"
                    className="form-control"
                    placeholder="e.g. +919876543210"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-email">Registered Parent Email *</label>
                  <input
                    id="modal-email"
                    type="email"
                    className="form-control"
                    placeholder="e.g. parent@family.com"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-status">Roster Status</label>
                  <select
                    id="modal-status"
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="dialog-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                 <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : (isEditing ? "Save Configuration" : "Initialize Profile")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
