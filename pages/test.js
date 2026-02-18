import { supabase } from '../services/supabaseClient';
import { useEffect, useState } from 'react';

export default function TestPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase.from('students').select('*');
      if (error) console.error(error);
      else setStudents(data);
    }
    fetchStudents();
  }, []);

  return (
    <div>
      <h1>Test Students</h1>
      <ul>
        {students.map((s) => (
          <li key={s.id}>{s.name} - {s.status}</li>
        ))}
      </ul>
    </div>
  );
}
