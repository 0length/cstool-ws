<!-- https://gist.githubusercontent.com/dunglas/05d901cb7560d2667d999875322e690a/raw/0a38538e801c7712f32105a441b103f608900e1c/graphql-client.php -->
<?php

function graphql_query(string $endpoint, string $query, array $variables = [], ?string $token = null): array
{
    $headers = ['Content-Type: application/json', 'User-Agent: Dunglas\'s minimal GraphQL client'];
    if (null !== $token) {
        $headers[] = "Authorization: bearer $token";
    }

    if (false === $data = @file_get_contents($endpoint, false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => $headers,
            'content' => json_encode(['query' => $query, 'variables' => $variables]),
        ]
    ]))) {
        $error = error_get_last();
        throw new \ErrorException($error['message'], $error['type']);
    }

    return json_decode($data, true);
}


$query = <<<'GRAPHQL'
query broadcast($action: ActionInput){
    broadcast(action: $action)
}
GRAPHQL;

graphql_query('https://api.github.com/graphql', $query, ['user' => 'dunglas'], 'my-oauth-token');