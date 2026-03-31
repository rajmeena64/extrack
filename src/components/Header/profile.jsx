import { useEffect, useRef } from "react";
import "./profile.css";

export default function Profile({ user, onClose }) {
  const profileRef = useRef(null);

  /* ---------- OUTSIDE CLICK CLOSE ---------- */
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  if (!user) return null;

  return (
    <div ref={profileRef} className="account-page">
      {/* LEFT MENU */}
      <aside className="settings-menu">
        <h4>Account Settings</h4>
        <ul>
          <li className="active">My Profile</li>
          <li>Security</li>
          <li>Teams</li>
          <li>Team Member</li>
          <li>Notifications</li>
          <li>Billing</li>
          <li>Data Export</li>
          <li className="danger">Delete Account</li>
        </ul>
      </aside>

      {/* RIGHT CONTENT */}
      <section className="settings-content">
        <h2>My Profile</h2>

        {/* PROFILE TOP */}
        <div className="box profile-top">
          <div className="profile-left">
            <img
              src={`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=3b5cff&color=fff`}
              alt="avatar"
            />
            <div>
              <h3>{user.firstName} {user.lastName}</h3>
              <p>{user.role || "User"}</p>
              <span>{user.location || "—"}</span>
            </div>
          </div>

          <button className="icon-btn">✎ Edit</button>
        </div>

        {/* PERSONAL INFO */}
        <div className="box">
          <div className="box-head">
            <h4>Personal Information</h4>
            <button className="icon-btn">✎ Edit</button>
          </div>

          <div className="grid">
            <div>
              <label>First Name</label>
              <p>{user.firstName}</p>
            </div>

            <div>
              <label>Last Name</label>
              <p>{user.lastName}</p>
            </div>

            <div>
              <label>Email address</label>
              <p>{user.email}</p>
            </div>

            <div>
              <label>Phone</label>
              <p>{user.phone || "—"}</p>
            </div>

            <div>
              <label>Bio</label>
              <p>{user.role || "—"}</p>
            </div>
          </div>
        </div>

        {/* ADDRESS */}
        <div className="box">
          <div className="box-head">
            <h4>Address</h4>
            <button className="icon-btn">✎ Edit</button>
          </div>

          <div className="grid">
            <div>
              <label>Country</label>
              <p>{user.country || "—"}</p>
            </div>

            <div>
              <label>City / State</label>
              <p>{user.city || "—"}</p>
            </div>

            <div>
              <label>Postal Code</label>
              <p>{user.postalCode || "—"}</p>
            </div>

            <div>
              <label>Tax ID</label>
              <p>{user.taxId || "—"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
