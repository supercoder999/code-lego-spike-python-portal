import React, { useRef, useEffect, useCallback } from 'react';
import * as Blockly from 'blockly';
import { toolbox, registerGenerators } from '../blockly/spikeBlocks';
import { useStore } from '../store/useStore';

const BlockEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const { setBlocklyXml, darkMode } = useStore();

  // Save Blockly XML state
  const updateCode = useCallback(() => {
    if (workspaceRef.current) {
      try {
        const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
        const xmlText = Blockly.Xml.domToText(xml);
        setBlocklyXml(xmlText);
      } catch (err) {
        console.error('Error generating code:', err);
      }
    }
  }, [setBlocklyXml]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Register custom block generators
    registerGenerators();

    // Create Blockly workspace
    const workspace = Blockly.inject(containerRef.current, {
      toolbox: toolbox as any,
      grid: {
        spacing: 20,
        length: 3,
        colour: darkMode ? '#444' : '#ccc',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      theme: darkMode ? Blockly.Themes.Classic : Blockly.Themes.Classic,
      renderer: 'zelos',
      sounds: false,
    });

    workspaceRef.current = workspace;

    // Add a default starter block
    const existingXml = useStore.getState().blocklyXml;
    if (existingXml) {
      try {
        const xml = Blockly.utils.xml.textToDom(existingXml);
        Blockly.Xml.domToWorkspace(xml, workspace);
      } catch {
        // If loading fails, add default block
        addDefaultBlocks(workspace);
      }
    } else {
      addDefaultBlocks(workspace);
    }

    // Listen for changes
    workspace.addChangeListener((event: Blockly.Events.Abstract) => {
      if (
        event.type === Blockly.Events.BLOCK_CHANGE ||
        event.type === Blockly.Events.BLOCK_CREATE ||
        event.type === Blockly.Events.BLOCK_DELETE ||
        event.type === Blockly.Events.BLOCK_MOVE
      ) {
        updateCode();
      }
    });

    // Initial code generation
    setTimeout(updateCode, 100);

    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    // Also resize after a short delay to handle layout changes
    const timer = setTimeout(handleResize, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="block-editor">
      <div ref={containerRef} className="blockly-container" />
    </div>
  );
};

function addDefaultBlocks(workspace: Blockly.WorkspaceSvg) {
  const xml = `
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="spike_init_hub" x="30" y="30">
        <next>
          <block type="spike_hub_light">
            <field name="COLOR">Color.GREEN</field>
            <next>
              <block type="spike_hub_beep">
                <value name="FREQUENCY">
                  <shadow type="math_number">
                    <field name="NUM">500</field>
                  </shadow>
                </value>
                <value name="DURATION">
                  <shadow type="math_number">
                    <field name="NUM">200</field>
                  </shadow>
                </value>
                <next>
                  <block type="spike_wait">
                    <value name="TIME">
                      <shadow type="math_number">
                        <field name="NUM">2000</field>
                      </shadow>
                    </value>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </xml>
  `;

  try {
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.domToWorkspace(dom, workspace);
  } catch (err) {
    console.error('Error adding default blocks:', err);
  }
}

export default BlockEditor;
