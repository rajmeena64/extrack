import React from "react";
import { Dropdown } from "@/components/ui";
import { Copy01, DownloadCloud02, Edit01, Trash01 } from "@untitledui/icons";

export function TradeLogRowActions({
  trade,
  onOpenEdit,
  onCopy,
  onDownload,
  onDelete,
}) {
  return (
    <Dropdown.Root>
      <Dropdown.DotsButton />
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "edit" && onOpenEdit) onOpenEdit(trade);
            if (key === "copy" && onCopy) onCopy(trade);
            if (key === "download" && onDownload) onDownload(trade);
            if (key === "delete" && onDelete) onDelete(trade);
          }}
        >
          <Dropdown.Section>
            <Dropdown.Item id="edit" icon={Edit01}>
              Edit trade
            </Dropdown.Item>
            <Dropdown.Item id="copy" icon={Copy01}>
              Copy details
            </Dropdown.Item>
            <Dropdown.Item id="download" icon={DownloadCloud02}>
              Download JSON
            </Dropdown.Item>
          </Dropdown.Section>
          <Dropdown.Separator />
          <Dropdown.Section>
            <Dropdown.Item id="delete" icon={Trash01}>
              Delete trade
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}

export default TradeLogRowActions;
