import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/client';
import { getMultipleRandomQuestions } from '../services/questionsService';
import taskApi from '../api/taskApi';
import './Task.css';

export default function Task() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [research, setResearch] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [keywords, setKeywords] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Initialize the task with 5 questions
  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        const randomQuestions = getMultipleRandomQuestions(user.uid, 5);
        setQuestions(randomQuestions);
        setAnswers({});
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load task');
        setLoading(false);
      }
    })();
  }, [navigate, orderId]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImages(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            src: event.target.result,
            name: file.name,
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove uploaded image
  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // Text-to-speech functionality
  const handleTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    } else {
      setError('Text-to-speech is not supported in your browser');
    }
  };

  // Save current answer and move to next question
  const handleNext = () => {
    if (!research.trim()) {
      setError('Please provide research information');
      return;
    }

    if (!recommendations.trim()) {
      setError('Please provide recommendations');
      return;
    }

    // Save answer for current question
    const questionId = currentQuestion.id;
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        question: currentQuestion.question,
        research,
        recommendations,
        keywords,
        images: uploadedImages.map(img => ({ name: img.name, src: img.src })),
      }
    }));

    // Move to next question
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
      setResearch('');
      setRecommendations('');
      setKeywords('');
      setUploadedImages([]);
      setError('');
    }
  };

  // Go back to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // Save current answer first
      const questionId = currentQuestion.id;
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          question: currentQuestion.question,
          research,
          recommendations,
          keywords,
          images: uploadedImages.map(img => ({ name: img.name, src: img.src })),
        }
      }));

      // Go to previous question
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      
      // Restore previous answer
      const prevQuestionId = questions[prevIndex].id;
      const prevAnswer = answers[prevQuestionId];
      if (prevAnswer) {
        setResearch(prevAnswer.research);
        setRecommendations(prevAnswer.recommendations);
        setKeywords(prevAnswer.keywords);
        setUploadedImages(prevAnswer.images.map((img, idx) => ({
          id: idx,
          src: img.src,
          name: img.name,
        })));
      }
    }
  };

  // Submit all answers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Save the last answer
      const questionId = currentQuestion.id;
      const allAnswers = {
        ...answers,
        [questionId]: {
          question: currentQuestion.question,
          research,
          recommendations,
          keywords,
          images: uploadedImages.map(img => ({ name: img.name, src: img.src })),
        }
      };

      const user = auth.currentUser;
      const token = await user.getIdToken();

      // Submit all answers for the 5 questions
      const data = await taskApi.submitTask(token, {
        orderId,
        answers: allAnswers,
        totalQuestions: questions.length,
        completedAt: new Date().toISOString(),
      });

      setSubmitted(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Task submission error:', err);
      setError(err.message || 'Failed to submit task');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="task-container">
        <div className="task-loading">Loading your task...</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="task-container">
        <div className="task-loading">No questions available</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="task-container">
        <div className="task-success">
          <h2>✓ Task Completed Successfully!</h2>
          <p>All 5 questions answered. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-container">
      <div className="task-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
          ← Back to Dashboard
        </button>
        <h1>Complete Your Task - Question {currentQuestionIndex + 1}/5</h1>
        <div className="order-info">Order ID: {orderId?.substring(0, 12)}...</div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
      </div>
      <p className="progress-text">Progress: {currentQuestionIndex + 1} of {questions.length} questions</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={isLastQuestion ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="task-form card">
        {/* Section 1: Question Display */}
        <div className="task-section">
          <div className="section-header">
            <h2>📚 Question {currentQuestionIndex + 1}</h2>
            <p>Read and respond to this question</p>
          </div>
          
          <div className="question-card">
            <p className="question-text">{currentQuestion.question}</p>
            
            <div className="speech-controls">
              <button
                type="button"
                onClick={handleTextToSpeech}
                className={`btn btn-secondary ${isSpeaking ? 'active' : ''}`}
              >
                {isSpeaking ? '⏹ Stop Speaking' : '🔊 Read Aloud'}
              </button>
            </div>
          </div>

          <div className="keywords-section">
            <label htmlFor="keywords">Keywords to Remember (optional)</label>
            <textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Enter key terms related to the question..."
              rows="3"
            />
          </div>
        </div>

        {/* Section 2: Image Upload */}
        <div className="task-section">
          <div className="section-header">
            <h2>📸 Upload Images</h2>
            <p>Upload relevant images to support your answer</p>
          </div>

          <div className="image-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-input"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
            >
              + Upload Images
            </button>
          </div>

          {uploadedImages.length > 0 && (
            <div className="uploaded-images">
              <h3>Uploaded Images ({uploadedImages.length})</h3>
              <div className="image-grid">
                {uploadedImages.map(img => (
                  <div key={img.id} className="image-card">
                    <img src={img.src} alt={img.name} />
                    <p>{img.name}</p>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="btn-remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Research */}
        <div className="task-section">
          <div className="section-header">
            <h2>🔍 Research & Findings</h2>
            <p>Share what you researched about this topic</p>
          </div>

          <textarea
            value={research}
            onChange={(e) => setResearch(e.target.value)}
            placeholder="Describe your research findings, sources, and what you learned..."
            rows="6"
            required
          />
        </div>

        {/* Section 4: Recommendations */}
        <div className="task-section">
          <div className="section-header">
            <h2>💡 Recommendations</h2>
            <p>Based on your research, what are your recommendations?</p>
          </div>

          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Provide your recommendations, insights, and suggestions based on the question and your research..."
            rows="6"
            required
          />
        </div>

        {/* Navigation and Submit Buttons */}
        <div className="task-actions">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="btn btn-secondary"
          >
            ← Previous
          </button>
          
          <div className="question-counter">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${isLastQuestion ? 'btn-lg' : ''}`}
          >
            {loading ? 'Submitting...' : isLastQuestion ? '✓ Complete Task' : 'Next →'}
          </button>
        </div>
      </form>
    </div>
  );
}
