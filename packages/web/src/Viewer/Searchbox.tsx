import { useRef } from "react";
import styled from "@emotion/styled";
import "@vscode-elements/elements/dist/vscode-textfield";
import "@vscode-elements/elements/dist/vscode-icon";
import "@vscode-elements/elements/dist/vscode-badge";
import { VscodeTextfield } from "@vscode-elements/elements/dist/vscode-textfield";

export interface SearchboxProps {
  onChange: (script: string) => void;
  defaultValue: string;
  totalEntities: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const Container = styled.div`
  width: 100%;
  display: flex;
  background-color: var(--vscode-tab-inactiveBackground);
  padding: 0.5rem;
  position: sticky;
  top: 0;
`;

const InputWrapper = styled.div`
  width: 100%;
  height: 2rem;
  display: flex;
  vscode-textfield {
    width: 100%;
  }
`;

const ExpandButton = styled.button`
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  padding: 0 0.75rem;
  margin-left: 0.5rem;
  cursor: pointer;
  border-radius: 2px;
  font-size: 12px;
  white-space: nowrap;
  &:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
`;

export default function Searchbox({
  totalEntities: itemsCount,
  onChange,
  defaultValue,
  isExpanded,
  onToggleExpand,
}: SearchboxProps) {
  const inputRef = useRef<VscodeTextfield>(null);

  const clear = () => {
    if (!inputRef.current) return;
    inputRef.current.value = "";
    onChange(inputRef.current.value ?? "");
  };

  return (
    <Container>
      <InputWrapper>
        <vscode-textfield
          type="text"
          placeholder="JS script to manipulate data, e.g data.map(...).filter(...)"
          value={defaultValue}
          ref={inputRef}
        >
          <vscode-badge slot="content-before">data =&gt;</vscode-badge>
          <vscode-badge slot="content-after" variant="activity-bar-counter">
            {itemsCount} items decoded
          </vscode-badge>
          <vscode-icon
            slot="content-after"
            name="clear-all"
            title="clear-all"
            action-icon
            onClick={clear}
          />
          <vscode-icon
            slot="content-after"
            name="debug-start"
            title="Run"
            action-icon
            onClick={() => {
              onChange(inputRef.current?.value ?? "");
            }}
          />
        </vscode-textfield>
      </InputWrapper>
      <ExpandButton onClick={onToggleExpand}>
        {isExpanded ? "▼ Collapse" : "▶ Expand All"}
      </ExpandButton>
    </Container>
  );
}
