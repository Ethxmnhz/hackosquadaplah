import React, { useState } from "react";
import { Shield, Terminal, Clock, Link, Plus, Trash2, Lock, AlertTriangle } from "lucide-react";

interface QA {
  question: string;
  answer: string;
}

interface OperationLab {
  labName: string;
  description: string;
  time: string;
  vmUrl: string;
  qa: QA[];
}

const CreateOperationLab: React.FC = () => {
  const [lab, setLab] = useState<OperationLab>({
    labName: "",
    description: "",
    time: "",
    vmUrl: "",
    qa: [{ question: "", answer: "" }],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLab((prev) => ({ ...prev, [name]: value }));
  };

  const handleQAChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const updatedQA = [...lab.qa];
    updatedQA[index] = { ...updatedQA[index], [name]: value };
    setLab((prev) => ({ ...prev, qa: updatedQA }));
  };

  const addQAField = () => {
    setLab((prev) => ({ ...prev, qa: [...prev.qa, { question: "", answer: "" }] }));
  };

  const removeQAField = (index: number) => {
    const updatedQA = lab.qa.filter((_, i) => i !== index);
    setLab((prev) => ({ ...prev, qa: updatedQA }));
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Lab Created:", lab);

    // API call example:
    // fetch("/api/operation-labs", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(lab),
    // });

    alert("Operation Lab Created Successfully!");
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center relative">
      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-3"
        style={{
          backgroundImage: `linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      ></div>

      <div className="relative w-full max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-14 h-14 text-red-500 mr-4" />
            <div>
              <h1 className="text-4xl font-bold text-red-500 tracking-wide">
                CYBER OPERATIONS LAB
              </h1>
              <div className="text-sm text-gray-400 uppercase tracking-wider font-medium mt-1">
                Security Operations Platform
              </div>
            </div>
          </div>
          <div className="w-24 h-0.5 bg-red-500 mx-auto"></div>
        </div>

        {/* Main Form Container */}
        <div className="bg-gray-900 p-8 rounded-lg shadow-2xl border border-red-500 relative">
          <div className="relative">
            {/* Form Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-red-500">
              <div className="flex items-center">
                <Terminal className="w-7 h-7 text-red-500 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-red-500 uppercase tracking-wide">Create Operation Lab</h2>
                  <p className="text-gray-400 text-sm mt-1">Design and deploy cybersecurity training scenarios</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Classification</div>
                <div className="text-red-500 font-bold">RESTRICTED</div>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Lab Name */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-bold text-red-500 uppercase tracking-wide">
                  <Lock className="w-4 h-4 mr-2" />
                  Lab Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="labName"
                    value={lab.labName}
                    onChange={handleChange}
                    className="w-full p-3 pl-10 rounded-md bg-black border border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Enter operation lab designation"
                    required
                  />
                  <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                </div>
              </div>

              {/* Time */}
              <div className="space-y-3">
                <label className="flex items-center text-sm font-bold text-red-500 uppercase tracking-wide">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="time"
                    value={lab.time}
                    onChange={handleChange}
                    className="w-full p-3 pl-10 rounded-md bg-black border border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="e.g., 2 hours, 120 minutes"
                    required
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                </div>
              </div>
            </div>

            {/* Description - Full Width */}
            <div className="space-y-3 mb-8">
              <label className="flex items-center text-sm font-bold text-red-500 uppercase tracking-wide">
                <Terminal className="w-4 h-4 mr-2" />
                Mission Description
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="description"
                value={lab.description}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-black border border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all duration-200 text-white placeholder-gray-400 resize-none"
                rows={4}
                placeholder="Describe the cybersecurity scenario, objectives, and learning outcomes for this operation..."
                required
              />
            </div>

            {/* VM/URL Link */}
            <div className="space-y-3 mb-10">
              <label className="flex items-center text-sm font-bold text-red-500 uppercase tracking-wide">
                <Link className="w-4 h-4 mr-2" />
                Environment Access
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="vmUrl"
                  value={lab.vmUrl}
                  onChange={handleChange}
                  className="w-full p-3 pl-10 rounded-md bg-black border border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="https://secure-lab-environment.cyberops.com"
                />
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
              </div>
            </div>

            {/* Questions & Answers Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-red-500">
                <div className="flex items-center">
                  <Shield className="w-6 h-6 text-red-500 mr-3" />
                  <h3 className="text-xl font-bold text-red-500 uppercase tracking-wide">
                    Assessment Protocol
                  </h3>
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">
                  Q&A Modules: {lab.qa.length}
                </div>
              </div>

              <div className="space-y-6">
                {lab.qa.map((qa, index) => (
                  <div
                    key={index}
                    className="relative p-5 bg-gray-800 border border-red-500 rounded-lg hover:border-red-400 transition-all duration-200"
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-7 h-7 bg-red-500 rounded-md flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        <span className="text-lg font-bold text-red-500 uppercase tracking-wide">
                          Assessment Module {index + 1}
                        </span>
                      </div>
                      {lab.qa.length > 1 && (
                        <button
                          onClick={() => removeQAField(index)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900 rounded-md transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          Challenge Question
                        </label>
                        <input
                          type="text"
                          name="question"
                          value={qa.question}
                          onChange={(e) => handleQAChange(index, e)}
                          placeholder="Enter assessment question or challenge prompt"
                          className="w-full p-3 rounded-md bg-black border border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all duration-200 text-white placeholder-gray-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          Expected Solution
                        </label>
                        <textarea
                          name="answer"
                          value={qa.answer}
                          onChange={(e) => handleQAChange(index, e)}
                          placeholder="Enter the expected answer, solution methodology, or assessment criteria"
                          className="w-full p-3 rounded-md bg-black border border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500 outline-none transition-all duration-200 text-white placeholder-gray-400 resize-none"
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Button */}
              <button
                onClick={addQAField}
                className="flex items-center justify-center w-full p-4 bg-black border border-red-500 hover:border-red-400 hover:bg-gray-900 text-red-500 font-bold rounded-lg transition-all duration-200 uppercase tracking-wide"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Assessment Module
              </button>
            </div>

            {/* Submit Section */}
            <div className="mt-10 pt-6 border-t border-red-500">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">
                  Review all information before deployment. This action will create a new operational lab environment.
                </p>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 uppercase tracking-wide text-lg"
              >
                <div className="flex items-center justify-center">
                  <Shield className="w-5 h-5 mr-3" />
                  Deploy Operation Lab
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 uppercase tracking-wide">
            <span>Classified System</span>
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            <span>Authorized Personnel Only</span>
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            <span>Security Level: HIGH</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOperationLab;