package org.ligoj.app.plugin.artifactory.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * JFrog Artifactory repository model. An Artifactory repository is the
 * "registry" hosting the artifacts of a given package type.
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArtifactoryRepository {

	/**
	 * Repository key (identifier), e.g. <code>libs-release-local</code>.
	 */
	private String key;

	/**
	 * Package type: <code>docker</code>, <code>maven</code>, <code>nuget</code>,
	 * <code>npm</code>, <code>pypi</code>, …
	 */
	private String packageType;

	/**
	 * Repository class as returned by the single-repository configuration
	 * endpoint: <code>local</code>, <code>remote</code>, <code>virtual</code> or
	 * <code>federated</code>.
	 */
	private String rclass;

	/**
	 * Repository type as returned by the repositories list endpoint:
	 * <code>LOCAL</code>, <code>REMOTE</code>, <code>VIRTUAL</code>, …
	 */
	private String type;

	/**
	 * Public repository URL.
	 */
	private String url;

}
