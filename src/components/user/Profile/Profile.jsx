import { useEffect, useRef } from "react";
import { getUserAvatar } from "../../../utils/user/userAvatar";

export default function Profile({ user, onClose }) {
  const profileRef = useRef(null);

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

  const profilePicture = getUserAvatar(user);
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <div ref={profileRef} className="account-page flex flex-col min-[901px]:flex-row gap-7 p-7 bg-[#f5f7fb] rounded-2xl">
      <aside className="settings-menu w-full min-[901px]:w-[260px] bg-white rounded-[14px] p-[22px] shrink-0">
        <h4 className="text-base font-semibold mb-[18px] text-[#111]">Account Settings</h4>
        <ul className="list-none p-0 m-0">
          <li className="py-3 px-3.5 rounded-lg text-sm cursor-pointer transition-colors duration-200 bg-[#e6ebff] text-[#3b5cff] font-semibold">My Profile</li>
          <li className="py-3 px-3.5 rounded-lg text-sm text-[#555] cursor-pointer transition-colors duration-200 hover:bg-[#f0f2ff]">Security</li>
          <li className="py-3 px-3.5 rounded-lg text-sm text-[#555] cursor-pointer transition-colors duration-200 hover:bg-[#f0f2ff]">Teams</li>
          <li className="py-3 px-3.5 rounded-lg text-sm text-[#555] cursor-pointer transition-colors duration-200 hover:bg-[#f0f2ff]">Team Member</li>
          <li className="py-3 px-3.5 rounded-lg text-sm text-[#555] cursor-pointer transition-colors duration-200 hover:bg-[#f0f2ff]">Notifications</li>
          <li className="py-3 px-3.5 rounded-lg text-sm text-[#555] cursor-pointer transition-colors duration-200 hover:bg-[#f0f2ff]">Billing</li>
          <li className="py-3 px-3.5 rounded-lg text-sm text-[#555] cursor-pointer transition-colors duration-200 hover:bg-[#f0f2ff]">Data Export</li>
          <li className="py-3 px-3.5 rounded-lg text-sm cursor-pointer transition-colors duration-200 text-[#e54848] hover:bg-[#f0f2ff]">Delete Account</li>
        </ul>
      </aside>

      <section className="settings-content flex-1">
        <h2 className="text-xl font-semibold mb-[18px] text-[#111]">My Profile</h2>

        <div className="box bg-white rounded-[14px] p-[22px] mb-5 flex items-center justify-between">
          <div className="profile-left flex items-center gap-4">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={`${[user.firstName, user.lastName].filter(Boolean).join(" ") || "User"} profile`}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#3b5cff] text-white flex items-center justify-center text-xl font-bold uppercase select-none">
                {initials}
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold m-0 text-[#111]">{user.firstName} {user.lastName}</h3>
              <p className="text-sm my-0.5 text-[#666]">{user.role || "User"}</p>
              <span className="text-[13px] text-[#999]">{user.location || "—"}</span>
            </div>
          </div>

          <button className="icon-btn bg-[#f1f3ff] border-none py-[7px] px-3.5 rounded-lg text-[13px] font-medium text-[#3b5cff] cursor-pointer transition-colors duration-200 hover:bg-[#e1e6ff]">✎ Edit</button>
        </div>

        <div className="box bg-white rounded-[14px] p-[22px] mb-5">
          <div className="box-head flex items-center justify-between mb-[18px]">
            <h4 className="text-[15px] font-semibold m-0 text-[#111]">Personal Information</h4>
            <button className="icon-btn bg-[#f1f3ff] border-none py-[7px] px-3.5 rounded-lg text-[13px] font-medium text-[#3b5cff] cursor-pointer transition-colors duration-200 hover:bg-[#e1e6ff]">✎ Edit</button>
          </div>

          <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-x-10 gap-y-[22px]">
            <div>
              <label className="text-[13px] text-[#8a8a8a]">First Name</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.firstName}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">Last Name</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.lastName}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">Email address</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.email}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">Phone</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.phone || "—"}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">Bio</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.role || "—"}</p>
            </div>
          </div>
        </div>

        <div className="box bg-white rounded-[14px] p-[22px] mb-5">
          <div className="box-head flex items-center justify-between mb-[18px]">
            <h4 className="text-[15px] font-semibold m-0 text-[#111]">Address</h4>
            <button className="icon-btn bg-[#f1f3ff] border-none py-[7px] px-3.5 rounded-lg text-[13px] font-medium text-[#3b5cff] cursor-pointer transition-colors duration-200 hover:bg-[#e1e6ff]">✎ Edit</button>
          </div>

          <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-x-10 gap-y-[22px]">
            <div>
              <label className="text-[13px] text-[#8a8a8a]">Country</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.country || "—"}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">City / State</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.city || "—"}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">Postal Code</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.postalCode || "—"}</p>
            </div>

            <div>
              <label className="text-[13px] text-[#8a8a8a]">Tax ID</label>
              <p className="mt-1 text-sm font-medium text-[#222]">{user.taxId || "—"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
