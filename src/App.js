import React, { useState, useMemo } from 'react';
import { Search, Users, MapPin, DollarSign, Award, Briefcase, Star, Check, X, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import candidatesData from './candidatesData.json';

const HiringDashboard = () => {
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [scoringWeights, setScoringWeights] = useState({
    workAvailability: 25,
    relevantExperience: 30,
    experienceBreadth: 10,
    education: 20,
    skills: 10,
    leadership: 5
  });
  const [filters, setFilters] = useState({
    location: '',
    minSalary: '',
    maxSalary: '',
    skills: '',
    education: ''
  });

  // Helper function to get candidate display name with identifier
  const getCandidateDisplayInfo = (candidate) => {
    const emailPrefix = candidate.email ? candidate.email.split('@')[0] : 'unknown';
    const phoneEnding = candidate.phone && candidate.phone.length >= 4 ? candidate.phone.slice(-4) : '0000';
    
    return {
      displayName: candidate.name || 'Unknown',
      identifier: emailPrefix,
      phoneEnding: phoneEnding
    };
  };

  // Enhanced candidate scoring with configurable weighted attributes
  const calculateCandidateScore = (candidate, weights = scoringWeights) => {
    let score = 0;
    
    // Work Availability
    if (candidate.work_availability && candidate.work_availability.includes('full-time')) {
      score += weights.workAvailability;
    } else if (candidate.work_availability && candidate.work_availability.includes('part-time')) {
      score += weights.workAvailability * 0.5;
    }
    
    // Relevant Experience
    const techRoles = ['Engineer', 'Developer', 'Architect', 'CTO', 'Technical', 'Software', 'Full Stack', 'Frontend', 'Backend'];
    const managementRoles = ['Manager', 'Director', 'Lead', 'CEO', 'CTO', 'VP', 'Head', 'Chief'];
    const businessRoles = ['Analyst', 'Consultant', 'Product Manager', 'Business', 'Marketing', 'Sales'];
    const legalRoles = ['Attorney', 'Legal', 'Lawyer', 'Counsel', 'Partner'];
    
    let relevantExperienceScore = 0;
    
    const workExperiences = candidate.work_experiences || [];
    workExperiences.forEach((exp, index) => {
      if (!exp || !exp.roleName) return;
      
      const role = exp.roleName.toLowerCase();
      let roleRelevance = 0;
      
      if (techRoles.some(tech => role.includes(tech.toLowerCase()))) {
        roleRelevance = index === 0 ? 1.0 : 0.8;
      } else if (managementRoles.some(mgmt => role.includes(mgmt.toLowerCase()))) {
        roleRelevance = index === 0 ? 0.9 : 0.7;
      } else if (businessRoles.some(biz => role.includes(biz.toLowerCase()))) {
        roleRelevance = index === 0 ? 0.7 : 0.5;
      } else if (legalRoles.some(legal => role.includes(legal.toLowerCase()))) {
        roleRelevance = index === 0 ? 0.8 : 0.6;
      } else {
        roleRelevance = 0.2;
      }
      
      relevantExperienceScore += roleRelevance * (index === 0 ? 2 : 1);
    });
    
    score += Math.min(relevantExperienceScore * (weights.relevantExperience / 6), weights.relevantExperience);
    
    // Experience Breadth
    const experienceBonus = Math.min(workExperiences.length * (weights.experienceBreadth / 7), weights.experienceBreadth);
    score += experienceBonus;
    
    // Education
    const educationScores = {
      "High School Diploma": 3,
      "Associate's Degree": 6,
      "Bachelor's Degree": 10,
      "Master's Degree": 16,
      "Juris Doctor (J.D)": 18,
      "PhD": 20
    };
    
    let educationScore = 0;
    if (candidate.education && candidate.education.highest_level) {
      educationScore = educationScores[candidate.education.highest_level] || 0;
    }
    
    const degrees = candidate.education?.degrees || [];
    const hasHighGPA = degrees.some(d => d && d.gpa === "GPA 3.5-3.9");
    const hasMediumGPA = degrees.some(d => d && d.gpa === "GPA 3.0-3.4");
    if (hasHighGPA) educationScore += 3;
    else if (hasMediumGPA) educationScore += 1.5;
    
    const hasTop25School = degrees.some(d => d && d.isTop25);
    const hasTop50School = degrees.some(d => d && d.isTop50);
    if (hasTop25School) educationScore += 5;
    else if (hasTop50School) educationScore += 3;
    
    score += Math.min(educationScore * (weights.education / 25), weights.education);
    
    // Skills
    const highValueSkills = ['React', 'JavaScript', 'TypeScript', 'Python', 'Java', 'AWS', 'Docker', 'Node JS', 'Next JS'];
    const mediumValueSkills = ['Angular', 'Vue', 'PHP', 'C#', 'MongoDB', 'PostgreSQL', 'Redis'];
    const businessSkills = ['Project Management', 'Agile', 'Scrum', 'Analytics', 'Marketing'];
    
    let skillsScore = 0;
    const skills = candidate.skills || [];
    skills.forEach(skill => {
      if (!skill) return;
      
      if (highValueSkills.some(hvs => skill.toLowerCase().includes(hvs.toLowerCase()))) {
        skillsScore += 2;
      } else if (mediumValueSkills.some(mvs => skill.toLowerCase().includes(mvs.toLowerCase()))) {
        skillsScore += 1.5;
      } else if (businessSkills.some(bs => skill.toLowerCase().includes(bs.toLowerCase()))) {
        skillsScore += 1;
      } else {
        skillsScore += 0.5;
      }
    });
    
    score += Math.min(skillsScore * (weights.skills / 10), weights.skills);
    
    // Leadership
    const hasLeadership = workExperiences.some(exp => 
      exp && exp.roleName && (
        exp.roleName.includes('Manager') || 
        exp.roleName.includes('Director') || 
        exp.roleName.includes('Lead') ||
        exp.roleName.includes('Partner') ||
        exp.roleName.includes('CEO') ||
        exp.roleName.includes('CTO') ||
        exp.roleName.includes('Founder')
      )
    );
    if (hasLeadership) score += weights.leadership;
    
    return Math.round(Math.min(score, 100));
  };

  // Enhanced candidates with scores
  const enhancedCandidates = useMemo(() => {
    return candidatesData.map(candidate => {
      // Handle missing or malformed salary data
      let salaryNum = 0;
      try {
        const salaryStr = candidate.annual_salary_expectation?.['full-time'] || '$0';
        salaryNum = parseInt(salaryStr.replace(/[$,]/g, '')) || 0;
      } catch (error) {
        console.warn('Error parsing salary for candidate:', candidate.name, error);
        salaryNum = 0;
      }

      return {
        ...candidate,
        score: calculateCandidateScore(candidate, scoringWeights),
        salaryNum: salaryNum
      };
    });
  }, [scoringWeights]);

  // Value-for-money calculation
  const calculateValueScore = (candidate) => {
    if (!candidate.salaryNum || candidate.salaryNum === 0) return 0;
    return Math.round((candidate.score / candidate.salaryNum) * 100000);
  };

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return enhancedCandidates.filter(candidate => {
      // Safe search matching
      const name = candidate.name || '';
      const location = candidate.location || '';
      const skills = candidate.skills || [];
      
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           skills.some(skill => skill && skill.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesLocation = !filters.location || location.toLowerCase().includes(filters.location.toLowerCase());
      const matchesSalary = (!filters.minSalary || candidate.salaryNum >= parseInt(filters.minSalary)) &&
                           (!filters.maxSalary || candidate.salaryNum <= parseInt(filters.maxSalary));
      const matchesSkills = !filters.skills || skills.some(skill => 
        skill && skill.toLowerCase().includes(filters.skills.toLowerCase()));
      
      return matchesSearch && matchesLocation && matchesSalary && matchesSkills;
    });
  }, [enhancedCandidates, searchTerm, filters]);

  // Analytics data
  const locationData = useMemo(() => {
    const locations = {};
    enhancedCandidates.forEach(candidate => {
      const location = candidate.location || 'Unknown';
      locations[location] = (locations[location] || 0) + 1;
    });
    return Object.entries(locations).map(([location, count]) => ({ location, count }));
  }, [enhancedCandidates]);

  const salaryData = useMemo(() => {
    const ranges = { '0-50k': 0, '50k-75k': 0, '75k-100k': 0, '100k-125k': 0, '125k+': 0 };
    enhancedCandidates.forEach(candidate => {
      const salary = candidate.salaryNum || 0;
      if (salary < 50000) ranges['0-50k']++;
      else if (salary < 75000) ranges['50k-75k']++;
      else if (salary < 100000) ranges['75k-100k']++;
      else if (salary < 125000) ranges['100k-125k']++;
      else ranges['125k+']++;
    });
    return Object.entries(ranges).map(([range, count]) => ({ range, count }));
  }, [enhancedCandidates]);

  const toggleCandidateSelection = (candidate) => {
    setSelectedCandidates(prev => {
      const isSelected = prev.find(c => c.email === candidate.email);
      if (isSelected) {
        return prev.filter(c => c.email !== candidate.email);
      } else if (prev.length < 5) {
        return [...prev, candidate];
      }
      return prev;
    });
  };

  // Enhanced hiring recommendations
  const getHiringRecommendations = () => {
    const sortedCandidates = enhancedCandidates.sort((a, b) => b.score - a.score);
    
    const recommendations = {
      topPerformers: sortedCandidates.slice(0, 5),
      costEffective: enhancedCandidates
        .filter(c => c.salaryNum > 0 && c.salaryNum < 100000)
        .sort((a, b) => (b.score / Math.max(b.salaryNum, 1) * 100000) - (a.score / Math.max(a.salaryNum, 1) * 100000))
        .slice(0, 5),
      diverse: []
    };

    // Create diverse team recommendation
    const diverseTeam = [];
    const usedLocations = new Set();
    const usedRoles = new Set();
    
    for (const candidate of sortedCandidates) {
      if (diverseTeam.length >= 5) break;
      
      const location = candidate.location || 'Unknown';
      const role = candidate.work_experiences?.[0]?.roleName || 'Unknown';
      
      if (!usedLocations.has(location) || !usedRoles.has(role) || diverseTeam.length < 3) {
        diverseTeam.push(candidate);
        usedLocations.add(location);
        usedRoles.add(role);
      }
    }
    
    recommendations.diverse = diverseTeam;
    return recommendations;
  };

  // Component functions
  const CandidateCard = ({ candidate, isSelected, onSelect, onView }) => {
    const displayInfo = getCandidateDisplayInfo(candidate);
    
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {displayInfo.displayName}
              <span className="text-sm font-normal text-blue-600 ml-2">
                ({displayInfo.identifier})
              </span>
            </h3>
            <div className="flex items-center space-x-3 mt-1">
              <p className="text-sm text-gray-600 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {candidate.location}
              </p>
              <p className="text-xs text-gray-500">
                ID: •••{displayInfo.phoneEnding}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                {candidate.annual_salary_expectation?.['full-time'] || 'Not specified'}
              </div>
              <div className="text-xs text-gray-500">Score: {candidate.score}/100</div>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => onView(candidate)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelect(candidate)}
                className={`p-2 rounded ${
                  isSelected 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isSelected ? <Check className="w-4 h-4" /> : <Star className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-700 font-medium">Latest Role:</p>
            <p className="text-sm text-gray-600">
              {candidate.work_experiences?.[0]?.roleName || 'No experience listed'} 
              {candidate.work_experiences?.[0]?.company && ` at ${candidate.work_experiences[0].company}`}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-700 font-medium">Education:</p>
            <p className="text-sm text-gray-600">{candidate.education?.highest_level || 'Not specified'}</p>
          </div>
          
          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <p className="text-sm text-gray-700 font-medium">Skills:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {candidate.skills.slice(0, 3).map((skill, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded">
                    {skill}
                  </span>
                ))}
                {candidate.skills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                    +{candidate.skills.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Startup Hiring Dashboard</h1>
              <p className="text-gray-600">$100M Seed - Hiring Agent</p>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('candidates')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentView === 'candidates' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Candidates ({filteredCandidates.length})
              </button>
              <button
                onClick={() => setCurrentView('analysis')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentView === 'analysis' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team Analysis ({selectedCandidates.length}/5)
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                    <p className="text-2xl font-bold text-gray-900">{enhancedCandidates.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <Star className="w-8 h-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Selected</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedCandidates.length}/5</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Salary</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Math.round(enhancedCandidates.filter(c => c.salaryNum > 0).reduce((sum, c) => sum + c.salaryNum, 0) / Math.max(enhancedCandidates.filter(c => c.salaryNum > 0).length, 1) / 1000)}k
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center">
                  <Award className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {enhancedCandidates.length > 0 ? Math.round(enhancedCandidates.reduce((sum, c) => sum + c.score, 0) / enhancedCandidates.length) : 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">Candidates by Location</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={locationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">Salary Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salaryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Selected Team Preview */}
            {selectedCandidates.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">Your Selected Team ({selectedCandidates.length}/5)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCandidates.map(candidate => {
                    const displayInfo = getCandidateDisplayInfo(candidate);
                    return (
                      <div key={candidate.email} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h4 className="font-medium text-gray-900">
                          {displayInfo.displayName}
                          <span className="text-blue-600 text-sm ml-1">({displayInfo.identifier})</span>
                        </h4>
                        <p className="text-sm text-gray-600">{candidate.location}</p>
                        <p className="text-sm text-green-600 font-medium">{candidate.annual_salary_expectation?.['full-time'] || 'Not specified'}</p>
                        <p className="text-xs text-gray-500">Score: {candidate.score}/100 • ID: •••{displayInfo.phoneEnding}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-yellow-800">
                        <strong>Team Budget:</strong> ${selectedCandidates.reduce((sum, c) => sum + (c.salaryNum || 0), 0).toLocaleString()} annually
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView('analysis')}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      View Full Team Analysis →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'candidates' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Location"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Min Salary"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.minSalary}
                  onChange={(e) => setFilters(prev => ({ ...prev, minSalary: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Max Salary"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.maxSalary}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxSalary: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Skills"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.skills}
                  onChange={(e) => setFilters(prev => ({ ...prev, skills: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {filteredCandidates.length} of {enhancedCandidates.length} candidates
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowWeights(!showWeights)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
                  >
                    {showWeights ? 'Hide' : 'Configure'} Scoring Weights
                  </button>
                  <button
                    onClick={() => setShowRecommendations(!showRecommendations)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    {showRecommendations ? 'Hide' : 'Show'} AI Recommendations
                  </button>
                </div>
              </div>
            </div>

            {/* Scoring Weights Configuration */}
            {showWeights && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">⚙️ Configure Scoring Weights</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Adjust the importance of different factors in candidate scoring. All weights should total 100%.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(scoringWeights).map(([key, value]) => (
                    <div key={key} className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={value}
                          onChange={(e) => setScoringWeights(prev => ({
                            ...prev,
                            [key]: parseInt(e.target.value)
                          }))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-900 min-w-[3rem]">{value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total: {Object.values(scoringWeights).reduce((sum, val) => sum + val, 0)}% 
                    {Object.values(scoringWeights).reduce((sum, val) => sum + val, 0) !== 100 && 
                      <span className="text-red-600 ml-2">⚠️ Should equal 100%</span>
                    }
                  </div>
                  <button
                    onClick={() => setScoringWeights({
                      workAvailability: 25,
                      relevantExperience: 30,
                      experienceBreadth: 10,
                      education: 20,
                      skills: 10,
                      leadership: 5
                    })}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {showRecommendations && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">🤖 AI Hiring Recommendations</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  
                  {/* Top Performers */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">🏆 Top Performers</h4>
                    <p className="text-sm text-gray-600 mb-3">Highest overall weighted scores</p>
                    <div className="space-y-2">
                      {getHiringRecommendations().topPerformers.slice(0, 3).map(candidate => {
                        const displayInfo = getCandidateDisplayInfo(candidate);
                        return (
                          <div key={candidate.email} className="flex justify-between text-sm">
                            <span className="font-medium">
                              {displayInfo.displayName} 
                              <span className="text-blue-600 text-xs ml-1">({displayInfo.identifier})</span>
                            </span>
                            <span className="text-blue-600">Score: {candidate.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cost Effective */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">💰 Best Value</h4>
                    <p className="text-sm text-gray-600 mb-3">High performance per salary dollar</p>
                    <div className="space-y-2">
                      {getHiringRecommendations().costEffective.slice(0, 3).map(candidate => {
                        const displayInfo = getCandidateDisplayInfo(candidate);
                        return (
                          <div key={candidate.email} className="flex justify-between text-sm">
                            <span className="font-medium">
                              {displayInfo.displayName}
                              <span className="text-blue-600 text-xs ml-1">({displayInfo.identifier})</span>
                            </span>
                            <span className="text-green-600">{calculateValueScore(candidate)} pts/$</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diverse Team */}
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">🌍 Optimal Diverse Team</h4>
                    <p className="text-sm text-gray-600 mb-3">Geographic, role & education diversity</p>
                    <div className="space-y-2">
                      {getHiringRecommendations().diverse.slice(0, 3).map(candidate => {
                        const displayInfo = getCandidateDisplayInfo(candidate);
                        return (
                          <div key={candidate.email} className="flex justify-between text-sm">
                            <span className="font-medium">
                              {displayInfo.displayName}
                              <span className="text-blue-600 text-xs ml-1">({displayInfo.identifier})</span>
                            </span>
                            <span className="text-orange-600">{candidate.location}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Budget: ${getHiringRecommendations().diverse.reduce((sum, c) => sum + (c.salaryNum || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                </div>
                
                {/* Quick Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedCandidates(getHiringRecommendations().topPerformers);
                      setCurrentView('analysis');
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Select Top Performers
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCandidates(getHiringRecommendations().diverse);
                      setCurrentView('analysis');
                    }}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                  >
                    Select Diverse Team
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCandidates(getHiringRecommendations().costEffective);
                      setCurrentView('analysis');
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Select Best Value
                  </button>
                </div>
              </div>
            )}

            {/* Candidates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCandidates.map(candidate => (
                <CandidateCard
                  key={candidate.email}
                  candidate={candidate}
                  isSelected={selectedCandidates.find(c => c.email === candidate.email)}
                  onSelect={toggleCandidateSelection}
                  onView={setSelectedCandidate}
                />
              ))}
            </div>

            {filteredCandidates.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No candidates found matching your criteria.</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'analysis' && (
          <div className="space-y-6">
            {selectedCandidates.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No team members selected yet.</p>
                <p className="text-gray-400">Go to Candidates tab to start building your team.</p>
                <button
                  onClick={() => setCurrentView('candidates')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Candidates
                </button>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Your Startup Team ({selectedCandidates.length}/5)</h3>
                
                {selectedCandidates.length === 5 && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">🎉 Team Complete! Ready to revolutionize the market.</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCandidates.map(candidate => {
                    const displayInfo = getCandidateDisplayInfo(candidate);
                    return (
                      <div key={candidate.email} className="bg-gray-50 p-4 rounded-lg border-2 border-blue-200">
                        <h4 className="font-semibold text-gray-900">
                          {displayInfo.displayName}
                          <span className="text-blue-600 text-sm ml-1">({displayInfo.identifier})</span>
                        </h4>
                        <p className="text-sm text-gray-600">{candidate.work_experiences?.[0]?.roleName || 'No role'}</p>
                        <p className="text-sm text-gray-600">{candidate.location}</p>
                        <p className="text-sm font-medium text-green-600">{candidate.annual_salary_expectation?.['full-time'] || 'Not specified'}</p>
                        <p className="text-xs text-gray-500">Score: {candidate.score}/100 • ID: •••{displayInfo.phoneEnding}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Selection Status */}
      {selectedCandidates.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <p className="font-medium">
            {selectedCandidates.length}/5 candidates selected
          </p>
          {selectedCandidates.length === 5 && (
            <p className="text-sm">Team complete! Ready to hire.</p>
          )}
          {selectedCandidates.length >= 2 && (
            <button
              onClick={() => setCurrentView('analysis')}
              className="mt-2 w-full px-3 py-1 bg-white text-blue-600 text-sm rounded hover:bg-gray-100"
            >
              View Team Analysis →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HiringDashboard;