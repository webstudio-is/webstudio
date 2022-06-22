import { $getRoot, $getSelection } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { InstancePlugin } from "./plugins/instance";
import { config } from "./config";

export const TextEditor = ({ onChange }) => {
  return (
    <LexicalComposer initialConfig={config}>
      <div className="editor-container">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<Placeholder />}
        />
        <OnChangePlugin onChange={onChange} />
        <HistoryPlugin />
        <InstancePlugin />
      </div>
    </LexicalComposer>
  );
};

function Placeholder() {
  return <div className="editor-placeholder">Enter some plain text...</div>;
}
