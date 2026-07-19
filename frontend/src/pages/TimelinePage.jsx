import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StoriesBar from '../components/stories/StoriesBar';
import StoryViewer from '../components/stories/StoryViewer';
import PostComposer from '../components/timeline/PostComposer';
import PostCard from '../components/timeline/PostCard';

export default function TimelinePage() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState([]);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [storiesRes, postsRes] = await Promise.all([
        api.get('/stories'),
        api.get('/posts'),
      ]);
      setStoryGroups(storiesRes.data.storyGroups);
      setPosts(postsRes.data.posts);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddStory(newStory) {
    setStoryGroups((prev) => {
      const existing = prev.find((g) => g.user.id === user.id);
      if (existing) {
        return prev.map((g) =>
          g.user.id === user.id
            ? { ...g, stories: [...g.stories, { ...newStory, viewCount: 0, viewedByMe: true }] }
            : g,
        );
      }
      return [
        ...prev,
        { user, stories: [{ ...newStory, viewCount: 0, viewedByMe: true }] },
      ];
    });
  }

  function handleStoryDeleted(storyId) {
    setStoryGroups((prev) =>
      prev
        .map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== storyId) }))
        .filter((g) => g.stories.length > 0),
    );
  }

  function handlePostCreated(newPost) {
    setPosts((prev) => [{ ...newPost, likes: [], comments: [] }, ...prev]);
  }

  return (
    <div className="pt-3">
      <h1 className="text-xl font-bold text-gray-900 px-4 mb-2">Timeline</h1>

      <div className="border-b border-gray-100 mb-3">
        {!loading && (
          <StoriesBar
            storyGroups={storyGroups}
            currentUser={user}
            onAddStory={handleAddStory}
            onOpenStory={setViewingGroup}
          />
        )}
      </div>

      <PostComposer currentUser={user} onPostCreated={handlePostCreated} />

      {loading && <p className="text-center text-gray-400 text-sm mt-8">Loading timeline…</p>}

      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-8">
          No posts yet — be the first to share something!
        </p>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={user?.id} />
      ))}

      {viewingGroup && (
        <StoryViewer
          group={viewingGroup}
          currentUserId={user?.id}
          onClose={() => setViewingGroup(null)}
          onDeleted={handleStoryDeleted}
        />
      )}
    </div>
  );
}
