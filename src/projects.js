
import { stateManager } from './app_state.js';

const PROJECTS_STORAGE_KEY = 'niras_vent_projects';

export class ProjectManager {
    constructor() {
        this.projects = this.loadProjectsFromStorage();
    }

    loadProjectsFromStorage() {
        try {
            const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Failed to load projects", e);
            return {};
        }
    }

    saveProjectsToStorage() {
        try {
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(this.projects));
        } catch (e) {
            console.error("Failed to save projects", e);
        }
    }

    createProject(name) {
        if (!name) throw new Error("Projektnavn mangler.");
        if (this.projects[name]) throw new Error("Et projekt med dette navn findes allerede.");

        const currentState = stateManager.state;
        const projectData = {
            name: name,
            timestamp: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(currentState))
        };
        // Update project name in state as well
        projectData.data.projectName = name;

        this.projects[name] = projectData;
        this.saveProjectsToStorage();
        return projectData;
    }

    saveCurrentProjectAs(name) {
        return this.createProject(name);
    }

    updateProject(name) {
        if (!this.projects[name]) throw new Error("Projektet findes ikke.");

        const currentState = stateManager.state;
        this.projects[name] = {
            name: name,
            timestamp: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(currentState))
        };
        this.projects[name].data.projectName = name; // Ensure sync

        this.saveProjectsToStorage();
    }

    loadProject(name) {
        const project = this.projects[name];
        if (!project) throw new Error("Projektet findes ikke.");

        // Hand off to central import routine which handles old and new structures
        stateManager.importState(project.data);

        // Ensure name is correct if not present in data
        stateManager.state.projectName = name;
        stateManager.persist();

        // Refresh calculations and UI immediately
        if (window.recalculateSystem) {
            window.recalculateSystem();
        }
    }

    deleteProject(name) {
        if (this.projects[name]) {
            delete this.projects[name];
            this.saveProjectsToStorage();
        }
    }

    listProjects() {
        return Object.values(this.projects).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    projectExists(name) {
        return !!this.projects[name];
    }
}

export const projectManager = new ProjectManager();
