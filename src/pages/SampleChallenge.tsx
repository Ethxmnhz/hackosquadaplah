import React from 'react';
import { Gate } from '../components/gating/Gate';

// Temporary sample page to illustrate gating usage.
// Replace content_type/content_id with real IDs once content catalog available.

export default function SampleChallenge() {
  const dummyContentType = 'challenge';
  const dummyContentId = '00000000-0000-0000-0000-000000000001';
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">Sample Challenge (Gated)</h1>
      <Gate content_type={dummyContentType} content_id={dummyContentId}>
        <div className="space-y-4">
          <p className="text-gray-700">You have access! Render the protected challenge UI here.</p>
          <div className="p-4 border rounded bg-white shadow-sm">
            <p className="text-sm">Challenge body / tasks / assets...</p>
          </div>
        </div>
      </Gate>
    </div>
  );
}
