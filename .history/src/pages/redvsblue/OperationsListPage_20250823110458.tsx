import React from 'react';
import OperationCard from '../../components/redvsblue/OperationCard';
import { useNavigate } from 'react-router-dom';

const dummyOperations = [
  { id: 1, name: '2018 Cyber Breach', description: 'Simulate the infamous 2018 breach scenario.' },
  { id: 2, name: 'Bank Branch', description: 'Penetrate or defend a modern bank infrastructure.' },
  { id: 3, name: 'Corporate Office', description: 'Corporate espionage and defense simulation.' },
  { id: 4, name: 'Healthcare Hack', description: 'Defend or attack a hospital network.' },
  { id: 5, name: 'Airport Intrusion', description: 'Test the security of an airport IT system.' },
];

const OperationsListPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12">
      <div className="max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-8">All Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {dummyOperations.map(op => (
            <OperationCard key={op.id} name={op.name} description={op.description} onSelect={() => navigate(`/red-vs-blue/operations/${op.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperationsListPage;
