const { useState, useEffect, useRef } = React;
const { createRoot } = ReactDOM;

const App = () => {
    const [songs, setSongs] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [isCreator, setIsCreator] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        artist: '',
        description: ''
    });
    
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);
    const room = useRef(new WebsimSocket()).current;

    useEffect(() => {
        const checkIfCreator = async () => {
            try {
                const creator = await window.websim.getCreatedBy();
                setIsCreator(room.party.client.username === creator.username || 
                            room.party.client.username === 'api' || 
                            room.party.client.username === '@api');
            } catch (error) {
                console.error('Error checking creator:', error);
            }
        };

        checkIfCreator();
        
        // Subscribe to song collection
        const unsubscribe = room.collection('song').subscribe((songsList) => {
            // Sort songs by created_at from newest to oldest
            const sortedSongs = [...songsList].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
            setSongs(sortedSongs);
        });

        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check if file is audio
        if (!file.type.startsWith('audio/')) {
            showStatus('Please upload an audio file', 'error');
            return;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const file = fileInputRef.current.files[0];
        if (!file) {
            showStatus('Please select an audio file', 'error');
            return;
        }

        setIsLoading(true);
        
        try {
            // Upload the file to get URL
            const fileUrl = await window.websim.upload(file);
            
            // Create song record
            await room.collection('song').create({
                title: formData.title,
                artist: formData.artist,
                description: formData.description,
                fileUrl: fileUrl
            });
            
            // Reset form
            setFormData({
                title: '',
                artist: '',
                description: ''
            });
            fileInputRef.current.value = '';
            
            showStatus('Song uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading song:', error);
            showStatus('Error uploading song. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const playSong = (song) => {
        setCurrentSong(song);
        // Allow time for the audio element to update its source
        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.play().catch(err => {
                    console.error('Error playing audio:', err);
                });
            }
        }, 100);
    };

    const showStatus = (message, type = 'success') => {
        setStatusMessage(message);
        const statusElement = document.querySelector('.status-message');
        statusElement.classList.add('show');
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    };

    return (
        <div className={`container ${isCreator ? 'is-creator' : ''}`}>
            <header>
                <h1>Music Playlist</h1>
            </header>

            <div className="status-message">{statusMessage}</div>
            
            <div className="upload-form creator-only">
                <h2>Add New Song</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input 
                            type="text" 
                            id="title" 
                            name="title" 
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="artist">Artist</label>
                        <input 
                            type="text" 
                            id="artist" 
                            name="artist" 
                            value={formData.artist}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description (optional)</label>
                        <textarea 
                            id="description" 
                            name="description" 
                            value={formData.description}
                            onChange={handleInputChange}
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="file">Audio File</label>
                        <input 
                            type="file" 
                            id="file" 
                            accept="audio/*" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            required
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Uploading...' : 'Upload Song'}
                    </button>
                </form>
            </div>
            
            <div className="playlist">
                <h2>Songs</h2>
                {songs.length === 0 ? (
                    <p>No songs available yet.</p>
                ) : (
                    <ul className="song-list">
                        {songs.map((song) => (
                            <li key={song.id} className="song-item">
                                <div className="song-info">
                                    <div className="song-title">{song.title}</div>
                                    <div className="song-artist">{song.artist}</div>
                                    {song.description && <div className="song-description">{song.description}</div>}
                                    <div className="song-uploader">Added by: {song.username}</div>
                                </div>
                                <div className="controls">
                                    <button 
                                        className="play-btn" 
                                        onClick={() => playSong(song)}
                                        aria-label="Play song"
                                    >
                                        ▶
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {currentSong && (
                <div className="player-container">
                    <div className="current-playing">
                        <div className="song-details">
                            <div className="song-title">{currentSong.title}</div>
                            <div className="song-artist">{currentSong.artist}</div>
                        </div>
                    </div>
                    <audio 
                        ref={audioRef} 
                        src={currentSong.fileUrl} 
                        controls 
                        autoPlay
                    ></audio>
                </div>
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);