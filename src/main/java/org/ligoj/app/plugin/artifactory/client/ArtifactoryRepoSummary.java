package org.ligoj.app.plugin.artifactory.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * A per-repository entry of the Artifactory storage summary
 * (<code>/api/storageinfo</code> → <code>repositoriesSummaryList</code>).
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArtifactoryRepoSummary {

	/**
	 * The repository key this summary refers to.
	 */
	private String repoKey;

	/**
	 * Number of files hosted by the repository.
	 */
	private long filesCount;

	/**
	 * Number of items (files + folders) hosted by the repository.
	 */
	private long itemsCount;

	/**
	 * Human-readable used space, e.g. <code>1.2 GB</code>.
	 */
	private String usedSpace;

}
