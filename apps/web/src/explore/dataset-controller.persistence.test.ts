import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VisualizationData } from '@protspace/utils';
import { createEmptyExploreViewRequest } from './url-state';

const mocks = vi.hoisted(() => ({
  loadData: vi.fn(),
  markLastLoadStatus: vi.fn(),
  saveLastImportedFile: vi.fn(),
  resolvePendingLoadFinalization: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('./data-renderer', () => ({
  createDataRenderer: () => mocks.loadData,
}));

vi.mock('./persisted-dataset', () => ({
  createPersistedDatasetController: () => ({
    loadDefaultDatasetAndClearPersistedFile: vi.fn(),
    loadPersistedOrDefaultDataset: vi.fn(),
    tryLoadPersistedAgain: vi.fn(),
    clearCorruptedPersistedDataset: vi.fn(),
    recoverFromCorruptedPersistedDataset: vi.fn(),
  }),
}));

vi.mock('./opfs-dataset-store', () => ({
  markLastLoadStatus: mocks.markLastLoadStatus,
  saveLastImportedFile: mocks.saveLastImportedFile,
}));

vi.mock('./tooltip-annotations-store', () => ({
  readTooltipAnnotations: () => [],
  writeTooltipAnnotations: vi.fn(),
}));

vi.mock('../lib/notify', () => ({
  notify: { warning: mocks.warning, error: vi.fn() },
}));

import { createDatasetController } from './dataset-controller';

const data: VisualizationData = {
  protein_ids: ['P1'],
  projections: [{ name: 'umap', dimension: 2, data: new Float32Array([0, 0]) }],
  annotations: {
    ec: { kind: 'categorical', values: ['1.1.1.1'], colors: ['#000'], shapes: ['circle'] },
  },
  annotation_data: { ec: new Int32Array([0]) },
};

const file = new File(['bundle'], 'import.parquetbundle');

function buildController() {
  const overlayController = { update: vi.fn() };
  const options = {
    controlBar: { clearForNewDataset: vi.fn(), hasFileSettings: false },
    dataLoader: {},
    defaultDatasetName: 'default.parquetbundle',
    getIsDisposed: () => false,
    interactionController: {},
    legendElement: {
      clearForNewDataset: vi.fn(),
      setFileSettings: vi.fn(),
      applyEatSettings: vi.fn(),
    },
    loadQueue: {
      registerFileLoad: vi.fn(),
      getLoadMetaForFile: () => ({ sequence: 3, kind: 'user' as const }),
      getRunningLoadMeta: () => ({ sequence: 3, kind: 'user' as const }),
      getLatestSequence: () => 3,
      resolvePendingLoadFinalization: mocks.resolvePendingLoadFinalization,
    },
    overlayController,
    plotElement: {},
    setCurrentDatasetIsDemo: vi.fn(),
    setCurrentDatasetName: vi.fn(),
    structureViewer: {},
    viewController: {
      subscribeToViewChanges: vi.fn(() => () => {}),
      resolveLatestView: vi.fn(),
      getLatestViewRequest: vi.fn(() => createEmptyExploreViewRequest()),
      applyLatestViewForDatasetLoad: vi.fn(),
      setRequestedView: vi.fn(),
    },
  } as unknown as Parameters<typeof createDatasetController>[0];

  return { controller: createDatasetController(options), overlayController };
}

const loadedEvent = {
  detail: { data, settings: null, source: 'user', file },
} as unknown as Event;

describe('dataset controller OPFS persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markLastLoadStatus.mockResolvedValue(undefined);
    mocks.saveLastImportedFile.mockResolvedValue(undefined);
  });

  it('saves the imported file only after the render pass resolves', async () => {
    let finishRender = () => {};
    mocks.loadData.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRender = () => resolve();
        }),
    );

    const { controller, overlayController } = buildController();
    const pending = controller.handleDataLoaded(loadedEvent);

    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.loadData).toHaveBeenCalledOnce();
    expect(mocks.saveLastImportedFile).not.toHaveBeenCalled();
    // No blocking "Saving imported dataset..." overlay in front of the render.
    expect(overlayController.update).not.toHaveBeenCalled();

    finishRender();
    await pending;

    expect(mocks.saveLastImportedFile).toHaveBeenCalledWith(file);
    // markLastLoadStatus reads the metadata the save writes, so it must run after.
    expect(mocks.saveLastImportedFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.markLastLoadStatus.mock.invocationCallOrder[0],
    );
    expect(mocks.markLastLoadStatus).toHaveBeenCalledWith('success');
    expect(mocks.resolvePendingLoadFinalization).toHaveBeenCalledWith(3);
  });

  it('warns but still finishes the load when the save fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.loadData.mockResolvedValue(undefined);
    mocks.saveLastImportedFile.mockRejectedValue(new Error('quota exceeded'));

    const { controller } = buildController();
    await controller.handleDataLoaded(loadedEvent);

    expect(mocks.warning).toHaveBeenCalledOnce();
    expect(mocks.markLastLoadStatus).toHaveBeenCalledWith('success');
    expect(mocks.resolvePendingLoadFinalization).toHaveBeenCalledWith(3);
    consoleError.mockRestore();
  });
});
