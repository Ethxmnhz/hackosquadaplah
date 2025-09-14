
import React, { useState } from 'react';
import CreateOperationLabPage from './CreateOperationLabPage';

interface OperationLab {
	name: string;
	attackScenario: string;
	defenseScenario: string;
	redQuestions: string[];
	blueQuestions: string[];
}

const OperationsManagementPage = () => {
	const [labs, setLabs] = useState<OperationLab[]>([]);

	const handleAddLab = (lab: OperationLab) => {
		setLabs([lab, ...labs]);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12">
			<div className="max-w-4xl mx-auto w-full">
				<h1 className="text-3xl font-bold mb-6">Operations Management</h1>
				<CreateOperationLabPage onSubmit={handleAddLab} />
				<div className="mt-10">
					<h2 className="text-2xl font-bold mb-4">Created Operation Labs</h2>
					{labs.length === 0 && <div className="text-white/60">No labs created yet.</div>}
					<ul className="space-y-4">
						{labs.map((lab, i) => (
							<li key={i} className="bg-background-light/80 rounded-xl p-4 border border-primary/20">
								<div className="font-bold text-lg mb-1">{lab.name}</div>
								<div className="text-sm text-white/80 mb-1">Attack: {lab.attackScenario}</div>
								<div className="text-sm text-white/80 mb-1">Defense: {lab.defenseScenario}</div>
								<div className="text-sm text-red-400 mb-1">Red Questions: {lab.redQuestions.length}</div>
								<div className="text-sm text-blue-400">Blue Questions: {lab.blueQuestions.length}</div>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
};

export default OperationsManagementPage;
