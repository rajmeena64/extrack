import React, { useState, useEffect } from "react";
import { Paperclip, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, Modal, ImageViewerModal } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";
import { useQueryClient } from "@tanstack/react-query";
import tradeApi from "@/utils/api/tradeApi";

const compressImage = async (file) => {
  if (file.size < 1024 * 1024) return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
  return blob?.size < file.size ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }) : file;
};

export default function TradeAttachmentsSection({ trade }) {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();

  const [screenshots, setScreenshots] = useState(() => (Array.isArray(trade?.attachments) ? trade.attachments : []));
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState("");
  const [fullscreen, setFullscreen] = useState("");

  useEffect(() => {
    setScreenshots(Array.isArray(trade?.attachments) ? trade.attachments : []);
  }, [trade?.attachments, trade?.unique_id]);

  const activeId = trade?.unique_id;

  const handleUpload = async (file) => {
    if (!activeId || !file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setUploading(true);
    try {
      let uploadFile = file;
      try { uploadFile = await compressImage(file); } catch {}
      const fd = new FormData();
      fd.append("screenshot", uploadFile);
      const data = await tradeApi.uploadAttachment(activeId, fd);
      if (data?.success) {
        setScreenshots(data.attachments);
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        notify("Your attachment is ready.", "success");
      } else throw new Error(data?.error || "Upload failed");
    } catch (err) {
      notify(err?.response?.data?.error || err?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      setPreview("");
      URL.revokeObjectURL(url);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || !activeId) return;
    setDeleting(true);
    try {
      const data = await tradeApi.deleteAttachment(activeId, toDelete);
      if (data?.success) {
        setScreenshots(data.attachments);
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        notify("Attachment removed.", "success");
      } else throw new Error(data?.error || "Delete failed");
    } catch (err) {
      notify(err?.response?.data?.error || err?.message || "Delete failed", "error");
    } finally {
      setDeleting(false);
      setToDelete("");
    }
  };

  return (
    <>
      <Card variant="default" padding="sm">
        <CardHeader className="pb-2.5 mb-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <CardTitle className="flex items-center gap-1.5"><Paperclip className="w-4 h-4" /> Attachments ({screenshots?.length || 0})</CardTitle>
          <div>
            <input type="file" id="screenshot-upload" accept="image/png,image/jpeg,image/webp" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ""; }} disabled={uploading} hidden />
            <label htmlFor="screenshot-upload" className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all cursor-pointer max-sm:self-end">
              <Plus className="w-3.5 h-3.5" /> Add
            </label>
          </div>
        </CardHeader>
        <div className="grid grid-cols-3 gap-2 max-h-[150px] overflow-y-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {preview && (
            <div className="group relative h-20 rounded-lg overflow-hidden border border-[var(--border-medium)] opacity-65 cursor-progress">
              <img className="w-full h-full object-cover" src={preview} alt="Uploading attachment" />
            </div>
          )}
          {screenshots?.length > 0 ? (
            screenshots.map((url, i) => (
              <div key={url || i} className="group relative h-20 rounded-lg overflow-hidden border border-[var(--border-medium)] cursor-pointer hover:scale-[1.02] transition-all">
                <img className="w-full h-full object-cover" src={url} alt={`Attachment ${i + 1}`} onClick={() => setFullscreen(url)} />
                <button className="absolute top-1 right-1 w-5 h-5 bg-[var(--accent-danger)] hover:bg-[var(--loss-color)] text-[var(--overlay-text)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 border-0 cursor-pointer text-xs" onClick={(e) => { e.stopPropagation(); setToDelete(url); }} disabled={deleting}>×</button>
              </div>
            ))
          ) : !preview && (
            <div className="col-span-full text-center py-4 px-3 text-[var(--text-secondary)] text-xs bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-medium)]">No attachments yet</div>
          )}
        </div>
      </Card>

      <Modal isOpen={Boolean(toDelete)} onClose={() => setToDelete("")} title="Delete Screenshot?" size="sm" bodyClassName="p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)] m-0 mb-5">Are you sure you want to delete this screenshot?</p>
        <div className="flex justify-center gap-3">
          <button className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => setToDelete("")}>Cancel</button>
          <button className="px-4 py-2 text-xs font-medium text-white bg-[var(--accent-danger)] hover:bg-[var(--loss-color)] rounded-lg cursor-pointer disabled:opacity-50" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
        </div>
      </Modal>

      <ImageViewerModal
        isOpen={Boolean(fullscreen)}
        src={fullscreen}
        alt="Trade Screenshot Preview"
        onClose={() => setFullscreen("")}
      />
    </>
  );
}
