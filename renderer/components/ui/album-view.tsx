import React from 'react';
import { IconLayoutGrid, IconList, IconLayoutGridAdd } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

type AlbumViewProps = {
  onViewChange: (view: 'grid' | 'list' | 'compact') => void;
  currentView: 'grid' | 'list' | 'compact';
};

const AlbumView: React.FC<AlbumViewProps> = ({ onViewChange, currentView }) => {
  return (
    <div className="album-view-buttons">
      <Button
        onClick={() => onViewChange('grid')}
        className={currentView === 'grid' ? 'active' : ''}
      >
        <IconLayoutGrid />
      </Button>
      <Button
        onClick={() => onViewChange('list')}
        className={currentView === 'list' ? 'active' : ''}
      >
        <IconList />
      </Button>
      <Button
        onClick={() => onViewChange('compact')}
        className={currentView === 'compact' ? 'active' : ''}
      >
        <IconLayoutGridAdd />
      </Button>
    </div>
  );
};

export default AlbumView;