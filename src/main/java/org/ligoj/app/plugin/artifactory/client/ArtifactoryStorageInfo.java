package org.ligoj.app.plugin.artifactory.client;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * Artifactory storage summary (<code>/api/storageinfo</code>). Exposes the
 * per-repository summary list from which the file count and used space of a
 * given repository are extracted.
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArtifactoryStorageInfo {

	/**
	 * The per-repository storage summaries (plus a synthetic <code>TOTAL</code>
	 * entry from Artifactory).
	 */
	private List<ArtifactoryRepoSummary> repositoriesSummaryList = new ArrayList<>();

}
