class CfgPatches
{
	class Harbor
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class Harbor
	{
		dir = "Harbor";
		name = "Harbor Lights";
		author = "Wick";
		type = "mod";
		dependencies[] = {"Core", "Game", "World", "Mission"};
		class defs
		{
			class engineScriptModule
			{
				value = "";
				files[] = {"Harbor/scripts/1_Core"};
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {"Harbor/scripts/2_GameLib"};
			};
			class gameScriptModule
			{
				value = "";
				files[] = {"Harbor/scripts/3_Game"};
			};
			class worldScriptModule
			{
				value = "";
				files[] = {"Harbor/scripts/4_World"};
			};
			class missionScriptModule
			{
				value = "";
				files[] = {"Harbor/scripts/5_Mission"};
			};
		};
	};
};
