import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, AlertCircle, CheckSquare, Bell, Settings, User, MapPin, Search, Download, Share2, Clock, Shield, BookOpen, Zap } from 'lucide-react';


const ChecklistComponent = () => {
  const [checklistType, setChecklistType] = useState('');
  const [generatedChecklist, setGeneratedChecklist] = useState('');

  const generateChecklist = () => {
    if (!checklistType.trim()) return;

    const checklists = {
      "fire safety": `# Fire Safety Checklist\n\n## Pre-Construction\n- [ ] Fire safety plan approved by fire department\n- [ ] Fire exits planned and marked\n- [ ] Fire detection system design approved\n\n## During Construction\n- [ ] Fire extinguishers installed on each floor\n- [ ] Emergency lighting functional\n- [ ] Fire exits kept clear\n- [ ] Sprinkler system tested\n\n## Post-Construction\n- [ ] Fire safety certificate obtained\n- [ ] Fire drill conducted\n- [ ] Maintenance schedule established`,
      "structural": `# Structural Safety Checklist\n\n## Foundation\n- [ ] Soil testing completed\n- [ ] Foundation design approved\n- [ ] Reinforcement as per drawings\n\n## Construction\n- [ ] Concrete quality tested\n- [ ] Structural drawings followed\n- [ ] Load calculations verified\n\n## Completion\n- [ ] Structural stability certificate\n- [ ] Load testing completed\n- [ ] Final inspection passed`,
      "default": `# General Construction Checklist\n\n## Planning Phase\n- [ ] All permits obtained\n- [ ] Site survey completed\n- [ ] Safety plan approved\n\n## Execution Phase\n- [ ] Daily safety inspections\n- [ ] Quality control checks\n- [ ] Progress documentation\n\n## Completion Phase\n- [ ] Final inspections\n- [ ] Compliance certificates\n- [ ] Handover documentation`
    };

    const key = checklistType.toLowerCase().includes('fire') ? 'fire safety' :
                checklistType.toLowerCase().includes('structural') ? 'structural' : 'default';

    setGeneratedChecklist(checklists[key]);
  };

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <CheckSquare className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Compliance Checklist Generator</h2>
        <p className="text-gray-600">Generate customized checklists for your construction projects</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What type of checklist do you need?
          </label>
          <input
            type="text"
            value={checklistType}
            onChange={(e) => setChecklistType(e.target.value)}
            placeholder="e.g., Fire safety, Structural inspection, Environmental compliance"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={generateChecklist}
          disabled={!checklistType.trim()}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          Generate Checklist
        </button>

        {generatedChecklist && (
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Generated Checklist</h3>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-800">
                  <Download className="h-5 w-5" />
                </button>
                <button className="text-green-600 hover:text-green-800">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{generatedChecklist}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistComponent;