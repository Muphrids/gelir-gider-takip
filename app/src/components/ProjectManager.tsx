import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Project } from '@/types';
import { Plus, Trash2, Briefcase, Edit } from 'lucide-react';

interface ProjectManagerProps {
  projects: Project[];
  onAdd: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
  onDelete: (id: string) => void;
  selectedProject: string | null;
  onSelectProject: (id: string | null) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#f43f5e', '#78716c', '#6b7280', '#374151', '#1f2937',
];

export function ProjectManager({
  projects,
  onAdd,
  onUpdate,
  onDelete,
  selectedProject,
  onSelectProject,
}: ProjectManagerProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isActive, setIsActive] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setColor(project.color);
    setIsActive(project.isActive);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProject) {
      onUpdate(editingProject.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        isActive,
      });
    } else {
      onAdd({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        isActive,
      });
    }

    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setIsActive(true);
    setEditingProject(null);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      if (selectedProject === deleteId) {
        onSelectProject(null);
      }
      setDeleteId(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t('proj.title')}
          </span>
          <Button size="sm" onClick={() => {
            setEditingProject(null);
            setName('');
            setDescription('');
            setColor(PRESET_COLORS[0]);
            setIsActive(true);
            setIsOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-1" />
            {t('proj.new')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* All Projects Option */}
        <div className="mb-4">
          <button
            onClick={() => onSelectProject(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
              selectedProject === null
                ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-gray-400" />
            <span className="font-medium">{t('proj.all')}</span>
          </button>
        </div>

        {/* Project List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {projects.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              {t('proj.empty')}
            </p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  selectedProject === project.id
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <button
                  onClick={() => onSelectProject(project.id)}
                  className="flex-1 flex items-center gap-3"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="text-left">
                    <span className="font-medium block">{project.name}</span>
                    {project.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">{project.description}</span>
                    )}
                  </div>
                  {!project.isActive && (
                    <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{t('proj.passive')}</span>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:text-blue-750 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  onClick={() => handleEditClick(project)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => setDeleteId(project.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Add Project Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setEditingProject(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? t('proj.editTitle') : t('proj.addTitle')}</DialogTitle>
            <DialogDescription>
              {editingProject ? t('proj.editDesc') : t('proj.addDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">{t('proj.nameLabel')}</Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('proj.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-description">{t('proj.descLabel')}</Label>
              <Textarea
                id="proj-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('proj.descPlaceholder')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('proj.colorLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="proj-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <Label htmlFor="proj-active" className="cursor-pointer">
                {t('proj.activeLabel')}
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsOpen(false);
                setEditingProject(null);
              }}>
                {t('general.cancel')}
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                {editingProject ? t('cat.updateBtn') : t('cat.addBtn')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('proj.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('proj.deleteDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('general.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('general.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
