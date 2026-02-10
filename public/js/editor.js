/**
 * Editor.js Integration for Email Marketer
 * Full-featured block-based email editor
 */

// Editor.js instances
let templateEditor = null;
let campaignEditor = null;

// Default block data
const defaultBlocks = {
  blocks: [
    {
      type: 'paragraph',
      data: {
        text: 'Start writing your email here...'
      }
    }
  ]
};

/**
 * Initialize Editor.js for templates
 */
async function initTemplateEditor(blocks = null) {
  if (templateEditor) {
    templateEditor.destroy();
  }

  const data = blocks ? { blocks } : defaultBlocks;

  templateEditor = new EditorJS({
    holder: 'template-editor-js',
    tools: getEditorTools(),
    data: data,
    placeholder: 'Click here to start writing or type "/" for commands',
    autofocus: true,
    inlineToolbar: true,
    onReady: () => {
      console.log('Template Editor.js is ready');
    }
  });

  await templateEditor.isReady;
  return templateEditor;
}

/**
 * Initialize Editor.js for campaigns
 */
async function initCampaignEditor(blocks = null) {
  if (campaignEditor) {
    campaignEditor.destroy();
  }

  const data = blocks ? { blocks } : defaultBlocks;

  campaignEditor = new EditorJS({
    holder: 'campaign-editor-js',
    tools: getEditorTools(),
    data: data,
    placeholder: 'Click here to start writing or type "/" for commands',
    autofocus: true,
    inlineToolbar: true,
    onReady: () => {
      console.log('Campaign Editor.js is ready');
    }
  });

  await campaignEditor.isReady;
  return campaignEditor;
}

/**
 * Get Editor.js tools configuration
 */
function getEditorTools() {
  return {
    // Text formatting tools
    header: {
      class: Header,
      inlineToolbar: ['marker', 'link'],
      shortcut: 'CMD+SHIFT+H',
      config: {
        placeholder: 'Enter a header',
        levels: [1, 2, 3, 4, 5, 6],
        defaultLevel: 2
      }
    },

    paragraph: {
      class: Paragraph,
      inlineToolbar: true,
    },

    // List tools
    list: {
      class: List,
      inlineToolbar: true,
      shortcut: 'CMD+SHIFT+L'
    },

    // Special content
    quote: {
      class: Quote,
      inlineToolbar: true,
      shortcut: 'CMD+SHIFT+O',
      config: {
        quotePlaceholder: 'Enter a quote',
        captionPlaceholder: 'Quote\'s author',
      },
    },

    code: {
      class: CodeTool,
      shortcut: 'CMD+SHIFT+C',
    },

    raw: {
      class: RawTool,
      inlineToolbar: true,
    },

    table: {
      class: Table,
      inlineToolbar: true,
      shortcut: 'CMD+ALT+T',
      config: {
        rows: 2,
        cols: 2,
      }
    },

    delimiter: {
      class: Delimiter,
      shortcut: 'CMD+SHIFT+D',
    },

    // Inline tools
    marker: {
      class: Marker,
      shortcut: 'CMD+SHIFT+M',
    },

    inlineCode: {
      class: InlineCode,
      shortcut: 'CMD+SHIFT+I',
    },

    // Embed and link tools
    linkTool: {
      class: LinkTool,
      config: {
        endpoint: '/api/fetch-link',
      }
    },

    // Image tool
    image: {
      class: ImageTool,
      config: {
        endpoints: {
          byFile: '/api/upload-image',
          byUrl: '/api/fetch-image',
        },
        additionalRequestData: {
          campaignId: editingCampaignId || 'new'
        }
      }
    },
  };
}

/**
 * Convert Editor.js blocks to HTML
 */
function blocksToHTML(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks.map(block => {
    switch (block.type) {
      case 'header':
        const level = block.data.level || 2;
        return `<h${level}>${escapeHtml(block.data.text)}</h${level}>`;

      case 'paragraph':
        return `<p>${block.data.text}</p>`;

      case 'list':
        const style = block.data.style || 'unordered';
        const items = block.data.items || [];
        const tag = style === 'ordered' ? 'ol' : 'ul';
        const listItems = items.map(item => {
          if (typeof item === 'string') {
            return `<li>${item}</li>`;
          }
          // Handle nested items
          if (item.content) {
            let html = `<li>${item.content}`;
            if (item.items && item.items.length > 0) {
              const nestedTag = style === 'ordered' ? 'ol' : 'ul';
              const nestedItems = item.items.map(ni => `<li>${ni.content || ni}</li>`).join('');
              html += `<${nestedTag}>${nestedItems}</${nestedTag}>`;
            }
            html += '</li>';
            return html;
          }
          return `<li>${item}</li>`;
        }).join('');
        return `<${tag}>${listItems}</${tag}>`;

      case 'quote':
        const text = block.data.text || '';
        const caption = block.data.caption ? `<cite>— ${escapeHtml(block.data.caption)}</cite>` : '';
        return `<blockquote>${text}${caption}</blockquote>`;

      case 'code':
        const code = block.data.code || '';
        return `<pre><code>${escapeHtml(code)}</code></pre>`;

      case 'raw':
        return block.data.html || '';

      case 'delimiter':
        return '<hr />';

      case 'table':
        const content = block.data.content || [];
        const rows = content.map(row => {
          const cells = row.map(cell => `<td>${cell}</td>`).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        return `<table border="1" cellpadding="8" cellspacing="0">${rows}</table>`;

      case 'linkTool':
        const linkData = block.data;
        if (linkData.meta && linkData.meta.title) {
          return `<a href="${linkData.link}" target="_blank" rel="noopener">${escapeHtml(linkData.meta.title)}</a>`;
        }
        return `<a href="${linkData.link}" target="_blank" rel="noopener">${linkData.link}</a>`;

      case 'image':
        const imgData = block.data;
        const imgUrl = imgData.file?.url || imgData.url || '';
        const imgCaption = imgData.caption ? `<figcaption style="text-align: center; font-size: 14px; color: #666; margin-top: 8px;">${escapeHtml(imgData.caption)}</figcaption>` : '';
        const imgStyles = 'max-width: 100%; height: auto; display: block; margin: 0 auto;';
        
        // For email compatibility, use table-based layout for images with captions
        if (imgCaption) {
          return `<table role="presentation" width="100%" style="margin: 16px 0;"><tr><td align="center"><img src="${imgUrl}" alt="${escapeHtml(imgData.caption || '')}" style="${imgStyles}" />${imgCaption}</td></tr></table>`;
        }
        return `<img src="${imgUrl}" alt="" style="${imgStyles} margin: 16px 0;" />`;

      default:
        return '';
    }
  }).join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get plain text from blocks (for plain text email version)
 */
function blocksToPlainText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks.map(block => {
    switch (block.type) {
      case 'header':
        const text = block.data.text || '';
        return text + '\n' + '='.repeat(text.length) + '\n\n';

      case 'paragraph':
        return (block.data.text || '') + '\n\n';

      case 'list':
        const items = block.data.items || [];
        const style = block.data.style || 'unordered';
        return items.map((item, i) => {
          const prefix = style === 'ordered' ? `${i + 1}. ` : '• ';
          if (typeof item === 'string') {
            return prefix + item;
          }
          if (item.content) {
            let line = prefix + item.content;
            if (item.items && item.items.length > 0) {
              const nested = item.items.map((ni, j) => {
                const nestedPrefix = style === 'ordered' ? `   ${i + 1}.${j + 1}. ` : '   • ';
                return nestedPrefix + (ni.content || ni);
              }).join('\n');
              line += '\n' + nested;
            }
            return line;
          }
          return prefix + item;
        }).join('\n') + '\n\n';

      case 'quote':
        const quoteText = block.data.text || '';
        const quoteCaption = block.data.caption ? `\n— ${block.data.caption}` : '';
        return '> ' + quoteText.replace(/\n/g, '\n> ') + quoteCaption + '\n\n';

      case 'code':
        return '```\n' + (block.data.code || '') + '\n```\n\n';

      case 'delimiter':
        return '---\n\n';

      case 'table':
        const tableContent = block.data.content || [];
        return tableContent.map(row => row.join(' | ')).join('\n') + '\n\n';

      default:
        return '';
    }
  }).join('');
}

/**
 * Get content from template editor
 */
async function getTemplateEditorContent() {
  if (!templateEditor) return null;
  try {
    const output = await templateEditor.save();
    return {
      blocks: output.blocks,
      html: blocksToHTML(output.blocks),
      plainText: blocksToPlainText(output.blocks)
    };
  } catch (err) {
    console.error('Error saving template editor:', err);
    return null;
  }
}

/**
 * Get content from campaign editor
 */
async function getCampaignEditorContent() {
  if (!campaignEditor) return null;
  try {
    const output = await campaignEditor.save();
    return {
      blocks: output.blocks,
      html: blocksToHTML(output.blocks),
      plainText: blocksToPlainText(output.blocks)
    };
  } catch (err) {
    console.error('Error saving campaign editor:', err);
    return null;
  }
}

// CSS for Editor.js styling
const editorStyles = `
<style>
  .codex-editor {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    min-height: 300px;
  }
  .codex-editor__redactor {
    padding: 20px;
  }
  .ce-block {
    margin-bottom: 10px;
  }
  .ce-header {
    font-weight: 600;
  }
  .dark-mode .codex-editor {
    background: #1a1a1a;
    border-color: #333;
  }
  .dark-mode .ce-block__content,
  .dark-mode .ce-toolbar__content,
  .dark-mode .ce-inline-toolbar {
    color: #fff;
  }
  .dark-mode .ce-block {
    color: #fff;
  }
  .dark-mode .cdx-block {
    color: #fff;
  }
  /* Toolbar styling */
  .ce-toolbar__plus {
    color: #666;
  }
  .dark-mode .ce-toolbar__plus {
    color: #999;
  }
  /* Inline toolbar */
  .ce-inline-toolbar {
    background: white;
    border: 1px solid #ddd;
  }
  .dark-mode .ce-inline-toolbar {
    background: #2a2a2a;
    border-color: #444;
  }
  .ce-inline-tool {
    color: #333;
  }
  .dark-mode .ce-inline-tool {
    color: #fff;
  }
  /* Block tunes */
  .ce-settings {
    background: white;
    border: 1px solid #ddd;
  }
  .dark-mode .ce-settings {
    background: #2a2a2a;
    border-color: #444;
  }
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', editorStyles);