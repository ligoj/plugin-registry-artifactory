package org.ligoj.app.plugin.artifactory;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.ligoj.app.api.SubscriptionStatusWithData;
import org.ligoj.app.plugin.artifactory.client.ArtifactoryRepository;
import org.ligoj.app.plugin.registry.RegistryResource;
import org.ligoj.app.plugin.registry.RegistryServicePlugin;
import org.ligoj.app.resource.NormalizeFormat;
import org.ligoj.app.resource.plugin.AbstractToolPluginResource;
import org.ligoj.bootstrap.core.NamedBean;
import org.ligoj.bootstrap.core.curl.AuthCurlProcessor;
import org.ligoj.bootstrap.core.curl.CurlProcessor;
import org.ligoj.bootstrap.core.curl.CurlRequest;
import org.ligoj.bootstrap.core.json.InMemoryPagination;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * JFrog Artifactory registry resource. Artifactory is multi-format, so the
 * artifact type is a real choice (docker, maven, nuget, npm, python).
 */
@Path(ArtifactoryPluginResource.URL)
@Component
@Produces(MediaType.APPLICATION_JSON)
public class ArtifactoryPluginResource extends AbstractToolPluginResource implements RegistryServicePlugin {

	/**
	 * Plug-in URL.
	 */
	public static final String URL = RegistryResource.SERVICE_URL + "/artifactory";

	/**
	 * Plug-in key.
	 */
	public static final String KEY = URL.replace('/', ':').substring(1);

	/**
	 * Artifactory base URL (node validation), e.g.
	 * <code>https://acme.jfrog.io/artifactory</code>.
	 */
	public static final String PARAMETER_URL = KEY + ":url";

	/**
	 * Login (node validation).
	 */
	public static final String PARAMETER_USER = KEY + ":user";

	/**
	 * Secret (node validation).
	 */
	public static final String PARAMETER_PASSWORD = KEY + ":password";

	/**
	 * Artifact type (subscription level).
	 */
	public static final String PARAMETER_TYPE = KEY + ":type";

	/**
	 * Target repository/registry (subscription level).
	 */
	public static final String PARAMETER_REGISTRY = KEY + ":registry";

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private InMemoryPagination inMemoryPagination;

	@Override
	public String getKey() {
		return KEY;
	}

	/**
	 * Return the base URL without the trailing slash.
	 */
	private String getBaseUrl(final Map<String, String> parameters) {
		return Strings.CS.removeEnd(parameters.get(PARAMETER_URL), "/");
	}

	/**
	 * Create a new processor using a basic authentication header built from
	 * the node credentials.
	 */
	private CurlProcessor newProcessor(final Map<String, String> parameters) {
		return new AuthCurlProcessor(parameters.get(PARAMETER_USER),
				StringUtils.trimToEmpty(parameters.get(PARAMETER_PASSWORD)));
	}

	@Override
	public boolean checkStatus(final Map<String, String> parameters) {
		// Node validation: authenticated call to the repositories endpoint.
		final var request = new CurlRequest(HttpMethod.GET, getBaseUrl(parameters) + "/api/repositories", null);
		try (var processor = newProcessor(parameters)) {
			return processor.process(request);
		}
	}

	/**
	 * Validate the subscription registry (the Artifactory repository) and return
	 * it. Throws when the repository cannot be resolved.
	 * <p>
	 * The rich single-repository endpoint ({@code /api/repositories/<key>}) is only available in
	 * Artifactory Pro (it answers HTTP 400 on OSS). When it does not resolve, the repository is
	 * instead looked up in the repository listing, which is available in OSS too.
	 */
	private ArtifactoryRepository validateRegistry(final Map<String, String> parameters) throws IOException {
		final var registry = parameters.get(PARAMETER_REGISTRY);
		final var request = new CurlRequest(HttpMethod.GET,
				getBaseUrl(parameters) + "/api/repositories/" + registry, null);
		request.setSaveResponse(true);
		final boolean found;
		try (var processor = newProcessor(parameters)) {
			found = processor.process(request);
		}
		if (found && StringUtils.isNotBlank(request.getResponse())) {
			return objectMapper.readValue(request.getResponse(), ArtifactoryRepository.class);
		}
		// OSS fallback: the single-repository endpoint is Pro-only, but the listing is not.
		return listRepositories(parameters).stream().filter(r -> registry.equals(r.getKey())).findFirst()
				.orElseThrow(() -> new ValidationJsonException(PARAMETER_REGISTRY, "artifactory-registry", registry));
	}

	/**
	 * List the repositories exposed by the node using the OSS-compatible listing endpoint.
	 */
	private List<ArtifactoryRepository> listRepositories(final Map<String, String> parameters) throws IOException {
		final var request = new CurlRequest(HttpMethod.GET, getBaseUrl(parameters) + "/api/repositories", null);
		request.setSaveResponse(true);
		final boolean found;
		try (var processor = newProcessor(parameters)) {
			found = processor.process(request);
		}
		if (!found) {
			return List.of();
		}
		return objectMapper.readValue(StringUtils.defaultIfBlank(request.getResponse(), "[]"),
				new TypeReference<List<ArtifactoryRepository>>() {
					// Nothing to extend
				});
	}

	@Override
	public void link(final int subscription) throws IOException {
		validateRegistry(subscriptionResource.getParameters(subscription));
	}

	@Override
	public SubscriptionStatusWithData checkSubscriptionStatus(final Map<String, String> parameters) throws IOException {
		final var status = new SubscriptionStatusWithData();
		final var repository = validateRegistry(parameters);
		status.put("format", repository.getPackageType());
		// 'rclass' comes from the Pro single-repository endpoint; the OSS listing exposes 'type'.
		status.put("type", StringUtils.defaultIfBlank(repository.getRclass(), repository.getType()));
		return status;
	}

	/**
	 * Find the Artifactory repositories matching the given criteria.
	 *
	 * @param node     The node identifier holding the registry parameters.
	 * @param criteria The search criteria.
	 * @return The matching repository keys.
	 * @throws IOException When the Artifactory response cannot be read.
	 */
	@GET
	@Path("{node}/{criteria}")
	public List<NamedBean<String>> findAllByName(@PathParam("node") final String node,
			@PathParam("criteria") final String criteria) throws IOException {
		final var parameters = pvResource.getNodeParameters(node);
		final var format = new NormalizeFormat();
		final var formatCriteria = format.format(criteria);
		return inMemoryPagination
				.newPage(listRepositories(parameters).stream()
						.filter(r -> format.format(r.getKey()).contains(formatCriteria))
						.map(r -> new NamedBean<>(r.getKey(), r.getKey())).toList(), PageRequest.of(0, 10))
				.getContent();
	}

}
