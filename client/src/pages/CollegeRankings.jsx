import React, { useState, useEffect } from 'react';
import { 
  Trophy, Flame, AlertCircle, Award, Building2, 
  ArrowRight, Users, Clock, CheckCircle2 
} from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function CollegeRankings({ onSelectCollege }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/colleges/rankings'));
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load college rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  if (loading) {
    return <div className="p-16 text-center text-brown-500 dark:text-warm-400 font-medium">Loading college performance statistics...</div>;
  }

  const { rankings, allColleges = [] } = data || {};
  const mostActive = rankings?.mostActive || [];
  const highestPending = rankings?.highestPending || [];
  const bestResolution = rankings?.bestResolution || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Title banner */}
      <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl p-6 sm:p-8 border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#A34C0C] dark:text-[#F5C28B] text-xs font-bold">
          <Trophy className="w-3.5 h-3.5 text-[#C9650F]" />
          <span>Public Transparency Metrics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] tracking-tight">
          College Performance & Statistics
        </h1>
        <p className="text-[#7A6250] dark:text-[#A89685] text-xs sm:text-sm max-w-3xl leading-relaxed">
          Meaningful rankings based on actual complaint handling, response speed, 
          and solution rates across registered colleges. Click any college to view its public complaints.
        </p>
      </div>

      {allColleges.length === 0 ? (
        <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl p-12 text-center border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#C9650F] mx-auto flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-lg">No Institutions Officially Registered Yet</h3>
          <p className="text-xs text-[#7A6250] dark:text-[#A89685] max-w-md mx-auto leading-relaxed">
            All unofficial mock data has been removed. Once an administrator officially registers a school or college, its performance metrics, grievance turnaround, and rankings will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* 3 Categories Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1: Most Active Colleges */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#DECDBB] dark:border-[#38261A] p-5 shadow-xs space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#C9650F]">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">Most Active Colleges</h3>
                  <p className="text-[11px] text-[#7A6250] dark:text-[#A89685]">Ranked by total complaint volume</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {mostActive.slice(0, 3).map((col, idx) => (
                  <div 
                    key={col.id} 
                    onClick={() => onSelectCollege && onSelectCollege(col.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] hover:border-[#C9650F] hover:bg-[#EAE0D3] transition cursor-pointer group"
                    title="Click to view complaints"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0 ? 'bg-[#C9650F] text-white shadow-xs' :
                        idx === 1 ? 'bg-[#DECDBB] text-[#3E291B]' :
                        'bg-[#8C7A6B] text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-xs truncate max-w-[150px] group-hover:text-[#C9650F] transition">{col.name}</div>
                        <div className="text-[10px] text-[#8C7A6B] font-mono">ID: {col.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-[#C9650F] dark:text-[#F5A623] text-sm">{col.totalComplaints}</div>
                      <div className="text-[10px] text-[#8C7A6B]">complaints</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category 2: Highest Waiting Complaints */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#DECDBB] dark:border-[#38261A] p-5 shadow-xs space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">Highest Waiting Complaints</h3>
                  <p className="text-[11px] text-[#7A6250] dark:text-[#A89685]">Colleges with complaints waiting for action</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {highestPending.slice(0, 3).map((col, idx) => (
                  <div 
                    key={col.id} 
                    onClick={() => onSelectCollege && onSelectCollege(col.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] hover:border-amber-500 hover:bg-[#EAE0D3] transition cursor-pointer group"
                    title="Click to view complaints"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-xs truncate max-w-[150px] group-hover:text-amber-700 transition">{col.name}</div>
                        <div className="text-[10px] text-[#8C7A6B] font-mono">ID: {col.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-amber-700 dark:text-amber-400 text-sm">{col.pendingComplaints + col.inProgressComplaints}</div>
                      <div className="text-[10px] text-[#8C7A6B]">waiting</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category 3: Best Solution Rate */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#DECDBB] dark:border-[#38261A] p-5 shadow-xs space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">Best Solution Rate</h3>
                  <p className="text-[11px] text-[#7A6250] dark:text-[#A89685]">Colleges that solve complaints fastest</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {bestResolution.slice(0, 3).map((col, idx) => (
                  <div 
                    key={col.id} 
                    onClick={() => onSelectCollege && onSelectCollege(col.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] hover:border-emerald-500 hover:bg-[#EAE0D3] transition cursor-pointer group"
                    title="Click to view complaints"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-xs truncate max-w-[150px] group-hover:text-emerald-700 transition">{col.name}</div>
                        <div className="text-[10px] text-[#8C7A6B] font-mono">ID: {col.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{col.resolutionRate}%</div>
                      <div className="text-[10px] text-[#8C7A6B]">{col.completedComplaints + col.resolvedComplaints} solved</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comprehensive Comparative Table */}
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E3D3C2] dark:border-[#38261A] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">
                  All Registered Institutions Breakdown
                </h3>
                <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                  Detailed numbers for Total, Waiting, Being Worked On, Solved, and Closed complaints. Click any row to view college complaints.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4ECE2] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] font-bold uppercase tracking-wider text-[10px] border-b border-[#E3D3C2] dark:border-[#38261A]">
                  <tr>
                    <th className="py-3.5 px-4">College Name & Permanent ID</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Total</th>
                    <th className="py-3.5 px-3 text-amber-700 dark:text-amber-400">Waiting</th>
                    <th className="py-3.5 px-3 text-[#C9650F] dark:text-[#F5A623]">Being Worked On</th>
                    <th className="py-3.5 px-3 text-emerald-700 dark:text-emerald-400">Solved</th>
                    <th className="py-3.5 px-3 text-emerald-800 dark:text-emerald-300">Closed</th>
                    <th className="py-3.5 px-3 text-rose-700 dark:text-rose-400">Not Accepted</th>
                    <th className="py-3.5 px-3">Avg Response Time</th>
                    <th className="py-3.5 px-4">Solution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DC] dark:divide-[#2E2017]">
                  {allColleges.map(col => (
                    <tr 
                      key={col.id} 
                      onClick={() => onSelectCollege && onSelectCollege(col.id)}
                      className="hover:bg-[#F6EFE7]/80 dark:hover:bg-[#281C15]/50 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-sm group-hover:text-[#C9650F] transition flex items-center gap-1.5">
                          <span>{col.name}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#C9650F]" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[#8C7A6B]">
                          <span className="font-mono bg-[#EDE4D8] dark:bg-[#2A1E17] px-1.5 py-0.2 rounded border border-[#DECDBB] dark:border-[#38261A] font-semibold text-[#4A3525] dark:text-[#D8C7B5]">
                            ID: {col.id}
                          </span>
                          <span>• Principal: {col.principalName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          col.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' :
                          col.status === 'restricted' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                          'bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] border border-[#DECDBB] dark:border-[#38261A]'
                        }`}>
                          {col.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">{col.totalComplaints}</td>
                      <td className="py-3.5 px-3 font-semibold text-amber-700 dark:text-amber-400">{col.pendingComplaints}</td>
                      <td className="py-3.5 px-3 font-semibold text-[#C9650F] dark:text-[#F5A623]">{col.inProgressComplaints}</td>
                      <td className="py-3.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{col.resolvedComplaints}</td>
                      <td className="py-3.5 px-3 font-semibold text-emerald-800 dark:text-emerald-300">{col.completedComplaints}</td>
                      <td className="py-3.5 px-3 font-semibold text-rose-600 dark:text-rose-400">{col.rejectedComplaints}</td>
                      <td className="py-3.5 px-3 text-[#7A6250] dark:text-[#A89685]">
                        {col.avgResolutionHours > 0 ? `${col.avgResolutionHours} hrs` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#DECDBB] dark:bg-[#38261A] rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${col.resolutionRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">{col.resolutionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
