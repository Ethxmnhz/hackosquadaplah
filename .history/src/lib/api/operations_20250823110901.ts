import { supabase } from '../supabase';

export interface OperationLab {
  id?: number;
  name: string;
  attackScenario: string;
  defenseScenario: string;
  redQuestions: string[];
  blueQuestions: string[];
  created_at?: string;
}

export async function createOperationLab(lab: OperationLab) {
  const { data, error } = await supabase
    .from('operation_labs')
    .insert([{ ...lab }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOperationLabs(): Promise<OperationLab[]> {
  const { data, error } = await supabase
    .from('operation_labs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
