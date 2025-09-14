
import React, { useState, useEffect } from 'react';
import CreateOperationLabPage from './CreateOperationLabPage';
import { supabase } from '../../lib/supabase';

interface OperationLab {
	name: string;
	attackScenario: string;
	defenseScenario: string;
	redQuestions: string[];
	blueQuestions: string[];
}


const OperationsManagementPage = () => {
	const [labs, setLabs] = useState<OperationLab[]>([]);
	const [waitingRequests, setWaitingRequests] = useState<any[]>([]);
	const [loadingRequests, setLoadingRequests] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const handleAddLab = (lab: OperationLab) => {
		setLabs([lab, ...labs]);
	};

	// Fetch all waiting match requests
	useEffect(() => {
		const fetchRequests = async () => {
			setLoadingRequests(true);
			const { data, error } = await supabase
				.from('match_requests')
				.select('*')
				.eq('status', 'waiting');
			if (!error) setWaitingRequests(data || []);
			setLoadingRequests(false);
		};
		fetchRequests();
	}, []);

	// Delete a single request
	const handleDeleteRequest = async (id: string) => {
		setDeleteLoading(true);
		await supabase.from('match_requests').delete().eq('id', id);
		setWaitingRequests(waitingRequests.filter(r => r.id !== id));
		setDeleteLoading(false);
	};

	// Flush all waiting requests
	const handleFlushAll = async () => {
		setDeleteLoading(true);
		await supabase.from('match_requests').delete().eq('status', 'waiting');
		setWaitingRequests([]);
		setDeleteLoading(false);
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

				{/* Waiting Matchmaking Requests Panel */}
				<div className="mt-12">
					<h2 className="text-2xl font-bold mb-4">Waiting Matchmaking Requests</h2>
					<button className="btn-primary mb-4" onClick={handleFlushAll} disabled={deleteLoading || waitingRequests.length === 0}>
						{deleteLoading ? 'Flushing...' : 'Flush All Waiting Requests'}
					</button>
					{loadingRequests ? (
						<div className="text-primary">Loading requests...</div>
					) : waitingRequests.length === 0 ? (
						<div className="text-white/60">No waiting requests.</div>
					) : (
						<ul className="space-y-2">
							{waitingRequests.map(req => (
								<li key={req.id} className="flex items-center gap-4 bg-background-dark/70 rounded-lg px-4 py-3">
									<span className={`font-bold ${req.team==='Red'?'text-red-400':'text-blue-400'}`}>{req.team} Team</span>
									<span className="text-white/80">Lab: {req.lab_id}</span>
									<button className="btn-primary px-4 py-2" disabled={deleteLoading} onClick={()=>handleDeleteRequest(req.id)}>
										Delete
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
};

export default OperationsManagementPage;
